import { DEFAULT_TOKEN_LIMIT } from "@/src/lib/constants";
import { isSynthetic, syntheticMarker, type BookRecord } from "./entities";
import { OUTCOME, ok, outcome, titleSimilarity, type ToolOutcome } from "./outcomes";
import {
  allBooks,
  bookBySlug,
  chunkCountFor,
  chunksFor,
  retrievalMode,
  searchChunks,
  topTopicsFor,
  type RetrievalMode,
} from "./repository";

export type Passage = {
  chunkId: number;
  chapterId: number | null;
  order: number;
  tokens: number;
  text: string;
  synthetic: boolean;
};

export type BookContext = {
  slug: string;
  title: string;
  authors: string;
  year: number | null;
  license: string | null;
  source: string;
  attribution: string;
  synthetic: boolean;
  syntheticNotice: string | null;
  retrievalMode: RetrievalMode;
  chunksAvailable: boolean;
  chunkCount: number;
  tokenLimit: number;
  tokensReturned: number;
  passages: Passage[];
};

function authorList(authors: unknown): string {
  return Array.isArray(authors) ? authors.join(", ") : "Unknown";
}

function attributionOf(book: BookRecord): string {
  return `${book.title} — ${authorList(book.authors)}${book.year ? ` (${book.year})` : ""}`;
}

/** Three closest catalogue titles, for a book that is not in the corpus. */
async function nearestTitles(query: string, limit = 3) {
  const all = await allBooks();
  return all
    .map((b) => ({ slug: b.slug, title: b.title, score: titleSimilarity(query, b.title) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Grounded context for one book.
 *
 * Reads the `chunks` table to decide whether a book is ingested. The previous
 * implementation hardcoded `chunksAvailable: false` and always fell back to the
 * description, which is why plot questions returned filler even for books that
 * do have prose.
 */
export async function getBookContext(input: {
  slug: string;
  topic?: string;
  tokenLimit?: number;
}): Promise<ToolOutcome<BookContext>> {
  const slug = input.slug.trim();
  const tokenLimit = input.tokenLimit ?? DEFAULT_TOKEN_LIMIT;

  const book = await bookBySlug(slug);

  if (!book) {
    const suggestions = await nearestTitles(slug);
    return outcome(
      OUTCOME.BOOK_NOT_IN_CORPUS,
      `No book is indexed under the id "${slug}". The three closest catalogue titles are: ` +
        suggestions.map((s) => `"${s.title}" (${s.slug})`).join(", ") +
        ".",
      [
        `Retry get_book_context with slug "${suggestions[0]?.slug ?? "unknown"}".`,
        "Call resolve_book_id with the title as free text to search more broadly.",
        "Call describe_corpus to see what the corpus actually contains.",
      ]
    );
  }

  const chunkCount = await chunkCountFor(book.id);
  const marker = syntheticMarker(book);

  if (chunkCount === 0) {
    return outcome(
      OUTCOME.BOOK_NOT_INGESTED,
      `"${book.title}" is in the catalogue but has no chapters or chunks yet, so no passages ` +
        `can be quoted. Metadata available: authors ${authorList(book.authors)}` +
        `${book.year ? `, published ${book.year}` : ""}, source ${book.source}` +
        `${book.license ? `, licence ${book.license}` : ""}. ` +
        `Description: ${book.description ?? "(none)"}`,
      [
        "Answer only from the metadata above, and say that the full text is not indexed.",
        "Call describe_corpus to list which books are ingested and can be quoted.",
        "Call search_books to find an ingested book covering the same topic.",
      ]
    );
  }

  // Ingested. Retrieve either a topic slice or the opening passages.
  const mode = await retrievalMode();
  const topic = input.topic?.trim();

  let selected = topic
    ? await searchChunks(topic, { bookIds: [book.id], limit: 40 })
    : (await chunksFor(book.id, 40)).map((c) => ({
        ...c,
        score: 0,
        bookSlug: book.slug,
        bookTitle: book.title,
      }));

  if (topic && selected.length === 0) {
    const terms = await topTopicsFor(book.id);
    return outcome(
      OUTCOME.NO_MATCH_FOR_TOPIC,
      `"${book.title}" is indexed (${chunkCount} passages) but nothing in it matches the topic ` +
        `"${topic}". No fallback passages are being returned. What this book actually covers: ` +
        `${terms.join("; ") || "(no chapter structure available)"}.`,
      [
        `Retry get_book_context on "${book.slug}" with one of: ${terms.slice(0, 3).join(", ") || "no topic"}.`,
        `Call get_book_context on "${book.slug}" with no topic to read from the beginning.`,
        `Call search_books with "${topic}" to find a different book that does cover it.`,
      ]
    );
  }

  // Apply the token budget in reading order.
  const passages: Passage[] = [];
  let tokensReturned = 0;
  let capped = false;

  for (const c of selected.sort((a, b) => a.order - b.order)) {
    if (tokensReturned + c.tokens > tokenLimit) {
      capped = true;
      break;
    }
    passages.push({
      chunkId: c.id,
      chapterId: c.chapterId,
      order: c.order,
      tokens: c.tokens,
      text: c.content,
      synthetic: isSynthetic(book),
    });
    tokensReturned += c.tokens;
  }

  if (passages.length === 0 && capped) {
    return outcome(
      OUTCOME.CAPPED,
      `The first matching passage of "${book.title}" is larger than the ${tokenLimit}-token ` +
        `budget for this call, so nothing could be returned within it. The cap is per call and ` +
        `resets on the next request — it is not a time-based quota.`,
      [
        `Retry get_book_context on "${book.slug}" with tokenLimit raised to ${Math.min(20000, tokenLimit * 4)}.`,
        `Call search_books with a narrower topic to land on a smaller passage.`,
      ]
    );
  }

  const data: BookContext = {
    slug: book.slug,
    title: book.title,
    authors: authorList(book.authors),
    year: book.year,
    license: book.license,
    source: book.source,
    attribution: attributionOf(book),
    synthetic: isSynthetic(book),
    syntheticNotice: marker?.notice ?? null,
    retrievalMode: mode,
    chunksAvailable: true,
    chunkCount,
    tokenLimit,
    tokensReturned,
    passages,
  };

  const detail =
    `Returned ${passages.length} of ${chunkCount} passages from "${book.title}" ` +
    `(${tokensReturned}/${tokenLimit} tokens${capped ? ", truncated at the budget" : ""}) ` +
    `using ${mode} retrieval${mode === "lexical" ? " — no embeddings exist, so ranking is keyword-based only" : ""}.`;

  return ok(detail, data, capped ? ["Raise tokenLimit or call expand_passage to continue reading."] : []);
}
