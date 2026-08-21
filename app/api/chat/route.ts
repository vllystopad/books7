import { NextRequest } from "next/server";
import { OpenAI } from "openai";
import { z } from "zod";
import {
  MCP_PROMPTS,
  MCP_TOOLS,
  executeTool,
  listResources,
} from "@/src/mcp/definitions";

const MODEL = "gpt-4o-mini";
const MAX_TOOL_ROUNDS = 3;

const ChatRequest = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(4000),
      })
    )
    .min(1)
    .max(50),
});

const SYSTEM_PROMPT = [
  "You are the Books7 librarian, answering over an MCP-backed library.",
  "Use the provided tools to ground every factual claim about a book.",
  "Never state that a book is in the library unless a tool result confirms it.",
  "Cite the attribution string returned by get_book_context when you quote or summarise.",
  "Keep answers short and concrete.",
].join("\n");

/** Events are newline-delimited JSON so the client can render them as they arrive. */
type AgentEvent =
  | { type: "handshake"; payload: unknown }
  | { type: "tool_call"; id: string; name: string; arguments: unknown }
  | { type: "tool_result"; id: string; name: string; result: unknown }
  | { type: "token"; text: string }
  | { type: "error"; message: string }
  | { type: "done" };

export async function POST(request: NextRequest) {
  const apiKey = process.env.NEXT_APP_OPENAI_API_KEY;

  if (!apiKey) {
    return Response.json(
      { error: "NEXT_APP_OPENAI_API_KEY is not set" },
      { status: 500 }
    );
  }

  let parsed;
  try {
    parsed = ChatRequest.parse(await request.json());
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const resources = await listResources();
  const client = new OpenAI({ apiKey });

  const openaiTools = MCP_TOOLS.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.inputSchema,
    },
  }));

  const encoder = new TextEncoder();

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: AgentEvent) =>
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));

      try {
        // Exactly what the agent is handed for this turn.
        send({
          type: "handshake",
          payload: {
            model: MODEL,
            systemPrompt: SYSTEM_PROMPT,
            tools: MCP_TOOLS,
            prompts: MCP_PROMPTS,
            resources,
            messages: parsed.messages,
          },
        });

        const messages: any[] = [
          { role: "system", content: SYSTEM_PROMPT },
          ...parsed.messages,
        ];

        // Resolve tool calls first, so each call and result can be surfaced,
        // then stream the final prose answer.
        for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
          const decision = await client.chat.completions.create({
            model: MODEL,
            messages,
            tools: openaiTools,
          });

          const choice = decision.choices[0].message;
          const calls = choice.tool_calls ?? [];

          if (calls.length === 0) {
            messages.push(choice);
            break;
          }

          messages.push(choice);

          for (const call of calls) {
            if (call.type !== "function") continue;

            let args: Record<string, unknown> = {};
            try {
              args = JSON.parse(call.function.arguments || "{}");
            } catch {
              args = {};
            }

            send({
              type: "tool_call",
              id: call.id,
              name: call.function.name,
              arguments: args,
            });

            const result = await executeTool(call.function.name, args);

            send({
              type: "tool_result",
              id: call.id,
              name: call.function.name,
              result,
            });

            messages.push({
              role: "tool",
              tool_call_id: call.id,
              content: JSON.stringify(result),
            });
          }
        }

        const stream = await client.chat.completions.create({
          model: MODEL,
          messages,
          stream: true,
        });

        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content;
          if (text) send({ type: "token", text });
        }

        send({ type: "done" });
        controller.close();
      } catch (err) {
        send({
          type: "error",
          message: err instanceof Error ? err.message : "Agent run failed",
        });
        controller.close();
      }
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
