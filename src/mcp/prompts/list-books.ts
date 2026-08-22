// MCP prompt: list-books — renders the catalogue by reading the resource layer.
import { listBooks } from "@/src/mcp/resources/list-books";
import type { McpPrompt } from "@/src/mcp/types";

export const listBooksPrompt: McpPrompt = {
  name: "list_books",
  description: "List every book currently indexed in the catalogue.",
  arguments: [],
  render: async () => {
    const resources = await listBooks();

    if (resources.length === 0) {
      return "The Books7 catalogue is currently empty.";
    }

    const lines = resources.map((r) => `- ${r.name} (${r.description}) → ${r.uri}`);

    return [
      `The Books7 catalogue contains ${resources.length} book${
        resources.length === 1 ? "" : "s"
      }:`,
      "",
      ...lines,
    ].join("\n");
  },
};
