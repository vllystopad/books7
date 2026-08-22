import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  MCP_PROMPTS,
  MCP_TOOLS,
  executeTool,
  listResources,
  renderPrompt,
} from "@/src/mcp/definitions";

const SUPPORTED_TRANSPORTS = new Set(["http", "sse"]);

const McpRequest = z.object({
  method: z.enum([
    "tools/list",
    "tools/call",
    "resources/list",
    "prompts/list",
    "prompts/get",
  ]),
  params: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ transport: string }> }
) {
  const { transport } = await params;

  if (!SUPPORTED_TRANSPORTS.has(transport)) {
    return NextResponse.json(
      { error: `Unsupported transport "${transport}"` },
      { status: 404 }
    );
  }

  let parsed;
  try {
    parsed = McpRequest.parse(await request.json());
  } catch {
    return NextResponse.json(
      { error: "Invalid MCP request. Expected { method, params? }." },
      { status: 400 }
    );
  }

  const args = (parsed.params ?? {}) as Record<string, unknown>;

  switch (parsed.method) {
    case "tools/list":
      return NextResponse.json({ tools: MCP_TOOLS });

    case "prompts/list":
      return NextResponse.json({ prompts: MCP_PROMPTS });

    case "resources/list":
      return NextResponse.json({ resources: await listResources() });

    case "tools/call": {
      const name = String(args.name ?? "");
      if (!name) {
        return NextResponse.json({ error: "params.name is required" }, { status: 400 });
      }
      const toolArgs = (args.arguments ?? {}) as Record<string, unknown>;
      return NextResponse.json({ result: await executeTool(name, toolArgs) });
    }

    case "prompts/get": {
      const name = String(args.name ?? "");
      if (!name) {
        return NextResponse.json({ error: "params.name is required" }, { status: 400 });
      }
      const promptArgs = (args.arguments ?? {}) as Record<string, unknown>;
      return NextResponse.json(await renderPrompt(name, promptArgs));
    }
  }
}

/** Discovery: what this endpoint exposes, without a round trip per registry. */
export async function GET() {
  return NextResponse.json({
    transports: [...SUPPORTED_TRANSPORTS],
    methods: [
      "tools/list",
      "tools/call",
      "resources/list",
      "prompts/list",
      "prompts/get",
    ],
    tools: MCP_TOOLS.map((t) => t.name),
    prompts: MCP_PROMPTS.map((p) => p.name),
  });
}
