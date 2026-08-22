import { desc, eq } from "drizzle-orm";
import { isSynthetic, type BookRecord } from "@/src/core/books/entities";
import { db } from "@/src/db/client";
import { books } from "@/src/db/schema";

/** Catalogue read for the web UI, ordered by trust score.
 *  Synthetic filtering goes through `isSynthetic` rather than a SQL literal so
 *  the predicate stays the single source of truth. */
export async function getLibrary(
  opts: { includeSynthetic?: boolean } = {}
): Promise<BookRecord[]> {
  const rows: BookRecord[] = await db
    .select()
    .from(books)
    .orderBy(desc(books.trustScore));

  return opts.includeSynthetic === false ? rows.filter((b) => !isSynthetic(b)) : rows;
}

export async function getBookBySlug(slug: string): Promise<BookRecord | undefined> {
  const rows: BookRecord[] = await db
    .select()
    .from(books)
    .where(eq(books.slug, slug))
    .limit(1);
  return rows[0];
}

/** Slugs safe to expose to crawlers — excludes fabricated works. */
export async function getIndexableSlugs(): Promise<string[]> {
  const rows: BookRecord[] = await db.select().from(books);
  return rows.filter((b) => !isSynthetic(b)).map((b) => b.slug);
}
