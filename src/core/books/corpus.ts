import { sql } from "drizzle-orm";
import { db } from "@/src/db/client";
import { isSynthetic } from "./entities";
import { allBooks, chunkCounts, retrievalMode, type RetrievalMode } from "./repository";

export type IngestedBook = {
  slug: string;
  title: string;
  year: number | null;
  chapters: number;
  chunks: number;
  synthetic: boolean;
};

export type CorpusStats = {
  totalBooks: number;
  totalChapters: number;
  totalChunks: number;
  ingestedBookCount: number;
  catalogueOnlyCount: number;
  languages: { language: string; books: number }[];
  yearRange: { min: number | null; max: number | null };
  sourceSplit: { synthetic: number; real: number };
  retrievalMode: RetrievalMode;
  embeddingsPresent: boolean;
  taxonomy: { available: boolean; note: string; topics: { name: string; books: number }[] };
  ingestedBooks: IngestedBook[];
  limitations: string[];
};

/** Every number here is read from the database at call time. Nothing about the
 *  corpus is hardcoded — this resource exists so the model stops guessing. */
export async function corpusStats(): Promise<CorpusStats> {
  const books = await allBooks();
  const counts = await chunkCounts();
  const mode = await retrievalMode();

  const totals: any = await db.execute(sql`
    SELECT (SELECT count(*)::int FROM chapters) AS chapters,
           (SELECT count(*)::int FROM chunks)   AS chunks,
           (SELECT count(*)::int FROM topics)   AS topics
  `);
  const t = (totals.rows ?? totals)[0] as { chapters: number; chunks: number; topics: number };

  const chapterRows: any = await db.execute(sql`
    SELECT book_id, count(*)::int AS n FROM chapters GROUP BY book_id
  `);
  const chapterMap = new Map<number, number>(
    (chapterRows.rows ?? chapterRows).map((r: any) => [Number(r.book_id), Number(r.n)])
  );

  const ingestedBooks: IngestedBook[] = books
    .filter((b) => (counts.get(b.id) ?? 0) > 0)
    .map((b) => ({
      slug: b.slug,
      title: b.title,
      year: b.year,
      chapters: chapterMap.get(b.id) ?? 0,
      chunks: counts.get(b.id) ?? 0,
      synthetic: isSynthetic(b),
    }))
    .sort((a, b) => (a.year ?? 0) - (b.year ?? 0));

  const langTally = new Map<string, number>();
  for (const b of books) langTally.set(b.language, (langTally.get(b.language) ?? 0) + 1);

  const years = books.map((b) => b.year).filter((y): y is number => typeof y === "number");
  const syntheticCount = books.filter(isSynthetic).length;

  // A topic taxonomy would come from the `topics` table. Reporting its absence
  // is deliberate — synthesising categories from titles would recreate exactly
  // the guessing this resource is meant to prevent.
  const taxonomyAvailable = t.topics > 0;

  return {
    totalBooks: books.length,
    totalChapters: t.chapters,
    totalChunks: t.chunks,
    ingestedBookCount: ingestedBooks.length,
    catalogueOnlyCount: books.length - ingestedBooks.length,
    languages: [...langTally.entries()]
      .map(([language, n]) => ({ language, books: n }))
      .sort((a, b) => b.books - a.books),
    yearRange: {
      min: years.length ? Math.min(...years) : null,
      max: years.length ? Math.max(...years) : null,
    },
    sourceSplit: { synthetic: syntheticCount, real: books.length - syntheticCount },
    retrievalMode: mode,
    embeddingsPresent: mode === "hybrid",
    taxonomy: {
      available: taxonomyAvailable,
      note: taxonomyAvailable
        ? "Topic taxonomy generated at ingest."
        : "No topic taxonomy has been generated; topic coverage cannot be reported. Do not infer categories from titles.",
      topics: [],
    },
    ingestedBooks,
    limitations: buildLimitations({
      catalogueOnly: books.length - ingestedBooks.length,
      total: books.length,
      syntheticCount,
      taxonomyAvailable,
      mode,
    }),
  };
}

function buildLimitations(x: {
  catalogueOnly: number;
  total: number;
  syntheticCount: number;
  taxonomyAvailable: boolean;
  mode: RetrievalMode;
}): string[] {
  const out = [
    "No contemporary copyrighted business books. Nothing in this corpus is a real commercially published work.",
    `${x.catalogueOnly} of ${x.total} books have metadata only — no chapters or chunks — so no passages can be quoted from them.`,
    "No full plot or chapter summaries beyond the chapter titles captured at ingest.",
  ];

  if (x.syntheticCount === x.total) {
    out.push(
      `All ${x.total} records are AI-generated demonstration data. There are currently no real public-domain works indexed, so nothing here can be cited as a real source.`
    );
  } else {
    out.push(
      `${x.syntheticCount} of ${x.total} records are AI-generated demonstration data and must never be presented as factual.`
    );
  }

  if (!x.taxonomyAvailable) {
    out.push("No topic taxonomy exists, so questions of the form 'what topics do you cover' cannot be answered from structured data.");
  }

  if (x.mode === "lexical") {
    out.push(
      "No embeddings exist, so retrieval is keyword matching only. Paraphrased or conceptual queries that share no vocabulary with the text will miss."
    );
  }

  return out;
}
