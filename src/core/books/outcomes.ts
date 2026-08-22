/**
 * Outcome labels for every content-returning tool.
 *
 * The calling model must be able to tell "no data" from "no answer exists".
 * A tool that returns an empty result without one of these labels produces
 * filler, because the model has no signal that the lookup failed.
 */
export const OUTCOME = {
  OK: "OK",
  BOOK_NOT_IN_CORPUS: "BOOK_NOT_IN_CORPUS",
  BOOK_NOT_INGESTED: "BOOK_NOT_INGESTED",
  NO_MATCH_FOR_TOPIC: "NO_MATCH_FOR_TOPIC",
  CAPPED: "CAPPED",
} as const;

export type Outcome = (typeof OUTCOME)[keyof typeof OUTCOME];

/**
 * Envelope returned by every content tool.
 *
 * `outcome` is declared first so it survives JSON serialization order, and
 * `message` repeats it on its own first line so it survives truncation of a
 * long response.
 */
export type ToolOutcome<T> = {
  outcome: Outcome;
  message: string;
  nextActions: string[];
  data: T | null;
};

/**
 * Builds the envelope. Every non-OK outcome requires at least one concrete
 * next action — a dead end with no exit is what produces filler.
 */
export function outcome<T>(
  label: Outcome,
  detail: string,
  nextActions: string[],
  data: T | null = null
): ToolOutcome<T> {
  if (label !== OUTCOME.OK && nextActions.length === 0) {
    throw new Error(`Outcome ${label} must carry at least one next action`);
  }

  return {
    outcome: label,
    // Label on the first line, detail after — never buried at the end.
    message: `${label}\n${detail}`,
    nextActions,
    data,
  };
}

export function ok<T>(detail: string, data: T, nextActions: string[] = []) {
  return outcome<T>(OUTCOME.OK, detail, nextActions, data);
}

/** Naive title similarity for "did you mean" suggestions. Token overlap plus a
 *  substring bonus — good enough to rank 25 titles without pg_trgm. */
export function titleSimilarity(query: string, title: string): number {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
  const q = norm(query);
  const t = norm(title);

  const qTokens = new Set(q.split(/\s+/).filter(Boolean));
  const tTokens = new Set(t.split(/\s+/).filter(Boolean));
  if (qTokens.size === 0 || tTokens.size === 0) return 0;

  let shared = 0;
  for (const token of qTokens) if (tTokens.has(token)) shared += 1;

  const overlap = shared / Math.max(qTokens.size, tTokens.size);
  const substring = t.includes(q.trim()) || q.includes(t.trim()) ? 0.4 : 0;

  return Math.min(1, overlap + substring);
}
