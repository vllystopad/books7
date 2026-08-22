// MCP resource: list-books — the DB-backed catalogue listing.
import { db } from "@/src/db/client";
import { books } from "@/src/db/schema";
import type { McpResource, McpResourceProvider } from "@/src/mcp/types";
import { authorList } from "@/src/mcp/utils";

export const BOOK_URI_SCHEME = "books7://book";

export function bookUri(slug: string): string {
  return `${BOOK_URI_SCHEME}/${slug}`;
}

type Row = {
  slug: string;
  title: string;
  authors: unknown;
  tokensTotal: number;
};

/** Single DB read behind the book catalogue. Prompts and tools that need the
 *  catalogue go through here rather than querying `books` themselves. */
export async function listBooks(): Promise<McpResource[]> {
  const rows: Row[] = await db
    .select({
      slug: books.slug,
      title: books.title,
      authors: books.authors,
      tokensTotal: books.tokensTotal,
    })
    .from(books);

  return rows.map((b) => ({
    uri: bookUri(b.slug),
    name: b.title,
    description: `${authorList(b.authors)} · ${b.tokensTotal.toLocaleString()} tokens`,
    mimeType: "application/json",
  }));
}

export const listBooksResource: McpResourceProvider = {
  name: "list-books",
  description: "Every book indexed in the Books7 catalogue, one resource per book.",
  list: listBooks,
};
