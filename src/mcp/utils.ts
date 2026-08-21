/** `books.authors` is jsonb, so it arrives as `unknown` and needs narrowing. */
export function authorList(authors: unknown): string {
  return Array.isArray(authors) ? authors.join(", ") : "Unknown";
}

/** Coerce a model-supplied numeric argument into the schema's declared range. */
export function clamp(
  value: unknown,
  min: number,
  max: number,
  fallback: number
): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}
