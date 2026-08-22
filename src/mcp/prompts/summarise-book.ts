// MCP prompt: summarise-book
import type { McpPrompt } from "@/src/mcp/types";

export const summariseBookPrompt: McpPrompt = {
  name: "summarise_book",
  description: "Produce a grounded summary of one book with attribution.",
  arguments: [{ name: "slug", description: "Book slug to summarise", required: true }],
  render: async (args) => {
    const slug = String(args.slug ?? "").trim();

    return [
      slug
        ? `Summarise the book with slug "${slug}".`
        : "Summarise the requested book.",
      "",
      "Call get_book_context first and summarise only from what it returns.",
      "Close with the attribution string from the tool result.",
    ].join("\n");
  },
};
