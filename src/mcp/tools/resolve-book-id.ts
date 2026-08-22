// MCP tool: resolve-book-id
import { ilike, or, sql } from "drizzle-orm";
import { db } from "@/src/db/client";
import { books } from "@/src/db/schema";
import type { McpTool } from "@/src/mcp/types";
import { authorList } from "@/src/mcp/utils";

type Row = {
  slug: string;
  title: string;
  authors: unknown;
  year: number | null;
};

export const resolveBookId = async (query: string) => {
  if (!query.trim()) return { query, matches: [] };

  const like = `%${query.trim()}%`;

  const rows: Row[] = await db
    .select({
      slug: books.slug,
      title: books.title,
      authors: books.authors,
      year: books.year,
    })
    .from(books)
    .where(
      or(
        ilike(books.title, like),
        ilike(books.description, like),
        sql`${books.authors}::text ILIKE ${like}`
      )
    )
    .limit(5);

  return {
    query,
    matches: rows.map((b) => ({
      slug: b.slug,
      title: b.title,
      authors: authorList(b.authors),
      year: b.year,
    })),
  };
};

export const resolveBookIdTool: McpTool = {
  name: "resolve_book_id",
  description:
    "Resolve a free-text book reference (title, author, or topic) to a Books7 slug. Call this before get_book_context when you only have a human-readable name.",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Title, author, or descriptive phrase, e.g. 'the whale book'",
      },
    },
    required: ["query"],
    additionalProperties: false,
  },
  examples: {
    answersWell: "Which book is the one about managers disappearing?",
    doesNotAnswer:
      "What does that book argue? — resolve the id first, then call get_book_context.",
  },
  execute: (args) => resolveBookId(String(args.query ?? "")),
};
