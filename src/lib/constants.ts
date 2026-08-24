export const SITE_NAME = "Books7";
export const SITE_DESCRIPTION = "Context7 for books";

/** Public origin, for absolute URLs in metadata, JSON-LD, and the sitemap.
 *  Server-only: NEXT_APP_* is not inlined into client bundles. */
export const SITE_URL =
  process.env.NEXT_APP_SITE_URL?.replace(/\/$/, "") || "http://localhost:3000";

export const MAX_SNIPPET_LENGTH = 2000; // chars
export const DEFAULT_TOKEN_LIMIT = 5000;
export const MIN_TOKEN_LIMIT = 1000;
export const MAX_TOKEN_LIMIT = 20000;
