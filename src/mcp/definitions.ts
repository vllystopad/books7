import { db } from "@/src/db/client";
import { books } from "@/src/db/schema";
import { getBookContextTool } from "@/src/mcp/tools/get-book-context";
import { resolveBookIdTool } from "@/src/mcp/tools/resolve-book-id";
import { searchBooksTool } from "@/src/mcp/tools/search-books";
import type { McpPrompt, McpResource, McpTool, McpToolSpec } from "@/src/mcp/types";
import { authorList } from "@/src/mcp/utils";

/**
 * Registry for the MCP surface. Each tool owns its own schema and executor in
 * `./tools/*`; this file only assembles them, so the definitions the model is
 * sent and the ones the inspector renders cannot drift apart.
 */

export const MCP_TOOL_REGISTRY: McpTool[] = [
  resolveBookIdTool,
  searchBooksTool,
  getBookContextTool,
];

/** `tools/list` — serializable specs, with `execute` stripped. */
export const MCP_TOOLS: McpToolSpec[] = MCP_TOOL_REGISTRY.map(
  ({ name, description, inputSchema }) => ({ name, description, inputSchema })
);

export const MCP_PROMPTS: McpPrompt[] = [
  {
    name: "compare_authors",
    description:
      "Compare what different authors in the library say about a single topic.",
    arguments: [
      { name: "topic", description: "The topic to compare across books", required: true },
    ],
  },
  {
    name: "summarise_book",
    description: "Produce a grounded summary of one book with attribution.",
    arguments: [{ name: "slug", description: "Book slug to summarise", required: true }],
  },
];

/** `resources/list` — one resource per indexed book. */
export async function listResources(): Promise<McpResource[]> {
  const rows: {
    slug: string;
    title: string;
    authors: unknown;
    tokensTotal: number;
  }[] = await db
    .select({
      slug: books.slug,
      title: books.title,
      authors: books.authors,
      tokensTotal: books.tokensTotal,
    })
    .from(books);

  return rows.map((b) => ({
    uri: `books7://book/${b.slug}`,
    name: b.title,
    description: `${authorList(b.authors)} · ${b.tokensTotal.toLocaleString()} tokens`,
    mimeType: "application/json",
  }));
}

/** `tools/call` — dispatch by name. */
export async function executeTool(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const tool = MCP_TOOL_REGISTRY.find((t) => t.name === name);
  if (!tool) return { error: `Unknown tool: ${name}` };
  return tool.execute(args);
}

export type { McpPrompt, McpResource, McpTool, McpToolSpec };
