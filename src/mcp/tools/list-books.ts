// MCP tool: list-books — tool-calling face of the list-books use case.
import { listBooks } from "@/src/mcp/resources/list-books";
import type { McpTool } from "@/src/mcp/types";
import { clamp } from "@/src/mcp/utils";

export const listBooksTool: McpTool = {
  name: "list_books",
  description:
    "List the books indexed in the Books7 catalogue, with their resource URIs. Use when the user asks what is available rather than asking about a specific title.",
  inputSchema: {
    type: "object",
    properties: {
      limit: {
        type: "integer",
        description: "Maximum books to return (1-50)",
        minimum: 1,
        maximum: 50,
        default: 25,
      },
    },
    required: [],
    additionalProperties: false,
  },
  execute: async (args) => {
    const limit = clamp(args.limit, 1, 50, 25);
    const resources = await listBooks();

    return {
      total: resources.length,
      returned: Math.min(limit, resources.length),
      books: resources.slice(0, limit).map((r) => ({
        uri: r.uri,
        title: r.name,
        summary: r.description,
      })),
    };
  },
};
