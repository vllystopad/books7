// MCP resource: books://corpus-summary — the self-description, for clients
// that surface resources. Tools-only clients get the same content via
// describe_corpus; both render from buildCorpusSummary so they cannot diverge.
import { buildCorpusSummary, renderCorpusSummary } from "@/src/mcp/corpus-summary";
import type { McpResource, McpResourceProvider } from "@/src/mcp/types";

export const CORPUS_SUMMARY_URI = "books://corpus-summary";

export async function corpusSummaryResource(): Promise<McpResource[]> {
  const s = await buildCorpusSummary();

  return [
    {
      uri: CORPUS_SUMMARY_URI,
      name: "Corpus summary",
      description:
        `${s.totalBooks} records · ${s.ingestedBookCount} readable · ${s.totalChunks} passages · ` +
        `${s.taxonomy.available ? "taxonomy available" : "no topic taxonomy"}`,
      mimeType: "text/plain",
    },
  ];
}

/** Body for `resources/read` on this URI. */
export async function readCorpusSummary(): Promise<string> {
  return renderCorpusSummary(await buildCorpusSummary());
}

export const corpusSummaryProvider: McpResourceProvider = {
  name: "corpus-summary",
  description: "What the corpus contains, and explicitly what it does not.",
  list: corpusSummaryResource,
};
