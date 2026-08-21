// MCP tool: get-book-context
import { eq } from "drizzle-orm";
import { db } from "@/src/db/client";
import { books } from "@/src/db/schema";
import type { McpTool } from "@/src/mcp/types";
import { authorList, clamp } from "@/src/mcp/utils";

type Row = typeof books.$inferSelect;

export const getBookContext = async (slug: string, tokenLimit = 5000) => {
  const [book]: [Row?] = await db
    .select()
    .from(books)
    .where(eq(books.slug, slug))
    .limit(1);

  if (!book) {
    return { error: `No book found with slug "${slug}"` };
  }

  return {
    slug: book.slug,
    title: book.title,
    authors: authorList(book.authors),
    year: book.year,
    license: book.license,
    source: book.source,
    trustScore: book.trustScore,
    tokenLimit,
    // Chunk-level retrieval lands with the ingestion pipeline; until then the
    // description is the only grounded text available for a book.
    context: book.description ?? "",
    chunksAvailable: false,
    attribution: `${book.title} — ${authorList(book.authors)}${
      book.year ? ` (${book.year})` : ""
    }`,
  };
};

export const getBookContextTool: McpTool = {
  name: "get_book_context",
  description:
    "Fetch grounded context for one book by slug: metadata, description, and token budget. Returns attribution fields so answers can cite the source.",
  inputSchema: {
    type: "object",
    properties: {
      slug: { type: "string", description: "Book slug from resolve_book_id" },
      tokenLimit: {
        type: "integer",
        description: "Maximum tokens of context to return",
        minimum: 1000,
        maximum: 20000,
        default: 5000,
      },
    },
    required: ["slug"],
    additionalProperties: false,
  },
  execute: (args) =>
    getBookContext(String(args.slug ?? ""), clamp(args.tokenLimit, 1000, 20000, 5000)),
};
