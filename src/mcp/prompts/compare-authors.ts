// MCP prompt: compare-authors
import type { McpPrompt } from "@/src/mcp/types";

export const compareAuthorsPrompt: McpPrompt = {
  name: "compare_authors",
  description: "Compare what different authors in the library say about a single topic.",
  arguments: [
    { name: "topic", description: "The topic to compare across books", required: true },
  ],
  render: async (args) => {
    const topic = String(args.topic ?? "").trim() || "the requested topic";

    return [
      `Compare what the authors in the Books7 catalogue say about: ${topic}.`,
      "",
      "Use search_books to gather passages across multiple books, then group the",
      "positions by author. Cite the attribution string from each result and note",
      "where authors disagree.",
    ].join("\n");
  },
};
