import { OpenAI } from "openai";
import {
  MCP_PROMPTS,
  MCP_TOOLS,
  executeTool,
  listResources,
  toOpenAiTools,
} from "@/src/mcp/definitions";

export const AGENT_MODEL = "gpt-4o-mini";
const MAX_TOOL_ROUNDS = 3;

export const SYSTEM_PROMPT = [
  "You are the Books7 librarian, answering over an MCP-backed library.",
  "",
  "Before describing what this library covers — and before assuming any subject is in it —",
  "call describe_corpus. It reports the real contents from the database, including an explicit",
  "list of what the corpus does NOT contain. Never invent a capability list from tool names.",
  "",
  "Every content tool returns an outcome label on the first line of its message:",
  "OK, BOOK_NOT_IN_CORPUS, BOOK_NOT_INGESTED, NO_MATCH_FOR_TOPIC, or CAPPED.",
  "Read that label and act on it. If it is not OK, tell the user plainly what was missing",
  "and take one of the listed nextActions. Never paper over a failed lookup with filler",
  "such as 'let me know if you have other questions' — say what was unavailable and why.",
  "",
  "Use the tools to ground every factual claim about a book.",
  "Never state that a book is in the library unless a tool result confirms it.",
  "Cite the attribution string returned by get_book_context when you quote or summarise.",
  "Content flagged synthetic: true is fabricated demonstration data — never present it as factual.",
  "Keep answers short and concrete.",
].join("\n");

export type AgentMessage = { role: "user" | "assistant"; content: string };

/** Streamed to the client as newline-delimited JSON. */
export type AgentEvent =
  | { type: "handshake"; payload: unknown }
  | { type: "tool_call"; id: string; name: string; arguments: unknown }
  | { type: "tool_result"; id: string; name: string; result: unknown }
  | { type: "token"; text: string }
  | { type: "error"; message: string }
  | { type: "done" };

/**
 * Runs one agent turn: resolves tool calls first so each call and result can be
 * surfaced individually, then streams the prose answer.
 */
export async function* runAgent(
  messages: AgentMessage[],
  apiKey: string
): AsyncGenerator<AgentEvent> {
  const client = new OpenAI({ apiKey });
  const openaiTools = toOpenAiTools();

  try {
    const resources = await listResources();

    // Exactly what the agent is handed for this turn.
    yield {
      type: "handshake",
      payload: {
        model: AGENT_MODEL,
        systemPrompt: SYSTEM_PROMPT,
        tools: MCP_TOOLS,
        prompts: MCP_PROMPTS,
        resources,
        messages,
      },
    };

    const thread: any[] = [{ role: "system", content: SYSTEM_PROMPT }, ...messages];

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const decision = await client.chat.completions.create({
        model: AGENT_MODEL,
        messages: thread,
        tools: openaiTools,
      });

      const choice = decision.choices[0].message;
      thread.push(choice);

      const calls = choice.tool_calls ?? [];
      if (calls.length === 0) break;

      for (const call of calls) {
        if (call.type !== "function") continue;

        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(call.function.arguments || "{}");
        } catch {
          args = {};
        }

        yield { type: "tool_call", id: call.id, name: call.function.name, arguments: args };

        const result = await executeTool(call.function.name, args);

        yield { type: "tool_result", id: call.id, name: call.function.name, result };

        thread.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(result),
        });
      }
    }

    const stream = await client.chat.completions.create({
      model: AGENT_MODEL,
      messages: thread,
      stream: true,
    });

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content;
      if (text) yield { type: "token", text };
    }

    yield { type: "done" };
  } catch (err) {
    yield {
      type: "error",
      message: err instanceof Error ? err.message : "Agent run failed",
    };
  }
}

/** Adapt an AgentEvent generator into an NDJSON response body. */
export function toNdjsonStream(
  events: AsyncGenerator<AgentEvent>
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      for await (const event of events) {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      }
      controller.close();
    },
  });
}
