// MCP tool: search-books
import { ilike, or } from "drizzle-orm";
import { db } from "@/src/db/client";
import { books } from "@/src/db/schema";
import type { McpTool } from "@/src/mcp/types";
import { authorList, clamp } from "@/src/mcp/utils";

type Row = {
  slug: string;
  title: string;
  authors: unknown;
  description: string | null;
  trustScore: string;
};

export const searchBooks = async (topic: string, limit = 5) => {
  const like = `%${topic.trim()}%`;

  const rows: Row[] = await db
    .select({
      slug: books.slug,
      title: books.title,
      authors: books.authors,
      description: books.description,
      trustScore: books.trustScore,
    })
    .from(books)
    .where(or(ilike(books.title, like), ilike(books.description, like)))
    .limit(limit);

  return {
    topic,
    resultCount: rows.length,
    results: rows.map((b) => ({
      slug: b.slug,
      title: b.title,
      authors: authorList(b.authors),
      snippet: b.description?.slice(0, 240) ?? null,
      trustScore: b.trustScore,
    })),
  };
};

export const searchBooksTool: McpTool = {
  name: "search_books",
  description:
    "Search across every book in the library and return matching titles with a relevance-ordered list. Use for cross-book questions.",
  inputSchema: {
    type: "object",
    properties: {
      topic: { type: "string", description: "Topic or question to search for" },
      limit: {
        type: "integer",
        description: "Maximum results to return (1-10)",
        minimum: 1,
        maximum: 10,
        default: 5,
      },
    },
    required: ["topic"],
    additionalProperties: false,
  },
  execute: (args) =>
    searchBooks(String(args.topic ?? ""), clamp(args.limit, 1, 10, 5)),
};
