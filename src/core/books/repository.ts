import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/src/db/client";
import { books, chapters, chunks } from "@/src/db/schema";
import type { BookRecord } from "./entities";

export type ChapterRow = typeof chapters.$inferSelect;
export type ChunkRow = typeof chunks.$inferSelect;

/** How retrieval actually ran. Surfaced to the model rather than hidden —
 *  `lexical` means semantic ranking was unavailable, not that nothing matched. */
export type RetrievalMode = "hybrid" | "lexical";

/**
 * The `chunks` table has no embedding column in this database, so semantic
 * ranking is impossible and retrieval degrades to lexical. Kept as a function
 * so it can start returning "hybrid" once embeddings are added, without
 * touching call sites.
 */
export async function retrievalMode(): Promise<RetrievalMode> {
  const res: any = await db.execute(sql`
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chunks' AND column_name = 'embedding' LIMIT 1
  `);
  const rows = res.rows ?? res;
  return rows.length > 0 ? "hybrid" : "lexical";
}

export async function allBooks(): Promise<BookRecord[]> {
  return db.select().from(books);
}

export async function bookBySlug(slug: string): Promise<BookRecord | undefined> {
  const rows: BookRecord[] = await db
    .select()
    .from(books)
    .where(eq(books.slug, slug))
    .limit(1);
  return rows[0];
}

export async function booksBySlugs(slugs: string[]): Promise<BookRecord[]> {
  if (slugs.length === 0) return [];
  return db.select().from(books).where(inArray(books.slug, slugs));
}

/** Chunk counts per book id. The authoritative "is this ingested?" signal —
 *  books.chapters_count is a stored column and can drift. */
export async function chunkCounts(): Promise<Map<number, number>> {
  const res: any = await db.execute(sql`
    SELECT book_id, count(*)::int AS n FROM chunks GROUP BY book_id
  `);
  const rows = (res.rows ?? res) as { book_id: number; n: number }[];
  return new Map(rows.map((r) => [Number(r.book_id), Number(r.n)]));
}

export async function chunkCountFor(bookId: number): Promise<number> {
  const res: any = await db.execute(sql`
    SELECT count(*)::int AS n FROM chunks WHERE book_id = ${bookId}
  `);
  const rows = (res.rows ?? res) as { n: number }[];
  return Number(rows[0]?.n ?? 0);
}

export async function chaptersFor(bookId: number): Promise<ChapterRow[]> {
  return db
    .select()
    .from(chapters)
    .where(eq(chapters.bookId, bookId))
    .orderBy(asc(chapters.order));
}

export async function chunksFor(bookId: number, limit = 50): Promise<ChunkRow[]> {
  return db
    .select()
    .from(chunks)
    .where(eq(chunks.bookId, bookId))
    .orderBy(asc(chunks.order))
    .limit(limit);
}

export async function chunkById(chunkId: number): Promise<ChunkRow | undefined> {
  const rows: ChunkRow[] = await db
    .select()
    .from(chunks)
    .where(eq(chunks.id, chunkId))
    .limit(1);
  return rows[0];
}

/** Neighbouring chunks in reading order, stopping at the chapter boundary. */
export async function neighbourChunks(
  origin: ChunkRow,
  direction: "before" | "after" | "both",
  count: number
): Promise<{ before: ChunkRow[]; after: ChunkRow[]; stoppedAtChapterEdge: boolean }> {
  const sameChapter = origin.chapterId
    ? and(eq(chunks.bookId, origin.bookId), eq(chunks.chapterId, origin.chapterId))
    : eq(chunks.bookId, origin.bookId);

  const siblings: ChunkRow[] = await db
    .select()
    .from(chunks)
    .where(sameChapter)
    .orderBy(asc(chunks.order));

  const idx = siblings.findIndex((c) => c.id === origin.id);
  if (idx === -1) return { before: [], after: [], stoppedAtChapterEdge: true };

  const wantBefore = direction === "before" || direction === "both" ? count : 0;
  const wantAfter = direction === "after" || direction === "both" ? count : 0;

  const before = siblings.slice(Math.max(0, idx - wantBefore), idx);
  const after = siblings.slice(idx + 1, idx + 1 + wantAfter);

  const stoppedAtChapterEdge =
    (wantBefore > 0 && before.length < wantBefore) ||
    (wantAfter > 0 && after.length < wantAfter);

  return { before, after, stoppedAtChapterEdge };
}

export type ScoredChunk = ChunkRow & { score: number; bookSlug: string; bookTitle: string };

/**
 * Lexical passage search over chunk text.
 *
 * `to_tsvector` is computed per query because this database has no generated
 * tsv column to index. Correct, but unindexed — fine at this corpus size.
 */
export async function searchChunks(
  query: string,
  opts: { bookIds?: number[]; limit?: number } = {}
): Promise<ScoredChunk[]> {
  const limit = opts.limit ?? 20;
  const scope =
    opts.bookIds && opts.bookIds.length > 0
      ? sql`AND c.book_id = ANY(${sql.raw(`ARRAY[${opts.bookIds.join(",")}]`)})`
      : sql``;

  const res: any = await db.execute(sql`
    SELECT c.id, c.book_id, c.chapter_id, c."order", c.content, c.tokens, c.created_at,
           b.slug AS book_slug, b.title AS book_title,
           ts_rank(to_tsvector('english', c.content),
                   plainto_tsquery('english', ${query})) AS score
    FROM chunks c
    JOIN books b ON b.id = c.book_id
    WHERE to_tsvector('english', c.content) @@ plainto_tsquery('english', ${query})
    ${scope}
    ORDER BY score DESC
    LIMIT ${limit}
  `);

  const rows = (res.rows ?? res) as any[];
  return rows.map((r) => ({
    id: Number(r.id),
    bookId: Number(r.book_id),
    chapterId: r.chapter_id === null ? null : Number(r.chapter_id),
    order: Number(r.order),
    content: String(r.content),
    tokens: Number(r.tokens),
    createdAt: r.created_at,
    score: Number(r.score),
    bookSlug: String(r.book_slug),
    bookTitle: String(r.book_title),
  }));
}

/**
 * What a book actually covers, in words a model can retry with.
 *
 * Chapter titles are preferred over `ts_stat` lexemes: ts_stat returns stemmed
 * forms ("decis", "revers", "organis") which are unreadable and do not reliably
 * re-match when fed back through plainto_tsquery.
 */
export async function topTopicsFor(bookId: number, limit = 8): Promise<string[]> {
  const chs = await chaptersFor(bookId);
  if (chs.length > 0) return chs.slice(0, limit).map((c) => c.title);
  return topTermsFor(bookId, limit);
}

/** Stemmed lexeme fallback for books with no chapter rows. */
export async function topTermsFor(bookId: number, limit = 8): Promise<string[]> {
  const res: any = await db.execute(sql`
    SELECT word FROM ts_stat(
      'SELECT to_tsvector(''english'', content) FROM chunks WHERE book_id = ' || ${String(bookId)}
    )
    ORDER BY nentry DESC, ndoc DESC
    LIMIT ${limit}
  `);
  const rows = (res.rows ?? res) as { word: string }[];
  return rows.map((r) => String(r.word));
}
