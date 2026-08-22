import { NextRequest } from "next/server";
import { z } from "zod";
import { runAgent, toNdjsonStream } from "@/src/mcp/agent";

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

  return new Response(toNdjsonStream(runAgent(parsed.messages, apiKey)), {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
