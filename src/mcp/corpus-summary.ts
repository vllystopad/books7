import { corpusStats, type CorpusStats } from "@/src/core/books/corpus";
import type { McpToolExamples } from "@/src/mcp/types";

export type ToolGuideEntry = {
  tool: string;
  description: string;
} & McpToolExamples;

export type CorpusSummary = CorpusStats & { toolGuide: ToolGuideEntry[] };

/**
 * Assembles the corpus self-description.
 *
 * Stats come from `src/core/books/corpus.ts` (all read from the database); the
 * tool guide is derived from the live registry, so it cannot drift from the
 * tools actually exposed. The registry is imported lazily to avoid a cycle —
 * `definitions.ts` pulls in the tools, one of which is describe_corpus.
 */
export async function buildCorpusSummary(): Promise<CorpusSummary> {
  const stats = await corpusStats();
  const { TOOL_REGISTRY } = await import("@/src/mcp/definitions");

  return {
    ...stats,
    toolGuide: TOOL_REGISTRY.map((t) => ({
      tool: t.name,
      description: t.description,
      answersWell: t.examples.answersWell,
      doesNotAnswer: t.examples.doesNotAnswer,
    })),
  };
}

/** Plain-text rendering, for clients that show resource text rather than JSON. */
export function renderCorpusSummary(s: CorpusSummary): string {
  const lines: string[] = [];

  lines.push("BOOKS7 CORPUS SUMMARY");
  lines.push("");
  lines.push(
    `${s.totalBooks} catalogue records · ${s.ingestedBookCount} ingested (readable) · ` +
      `${s.catalogueOnlyCount} metadata-only`
  );
  lines.push(`${s.totalChapters} chapters · ${s.totalChunks} passages`);
  lines.push(
    `Publication years: ${s.yearRange.min ?? "n/a"}–${s.yearRange.max ?? "n/a"}`
  );
  lines.push(
    `Languages: ${s.languages.map((l) => `${l.language} (${l.books})`).join(", ") || "n/a"}`
  );
  lines.push(
    `Provenance: ${s.sourceSplit.synthetic} AI-generated demo records, ` +
      `${s.sourceSplit.real} real public-domain works`
  );
  lines.push(`Retrieval: ${s.retrievalMode}${s.embeddingsPresent ? "" : " (no embeddings — keyword matching only)"}`);
  lines.push("");

  lines.push("TOPIC TAXONOMY");
  lines.push(s.taxonomy.note);
  lines.push("");

  lines.push("READABLE BOOKS (passages can be quoted from these only)");
  for (const b of s.ingestedBooks) {
    lines.push(
      `  ${b.slug} — "${b.title}"${b.year ? ` (${b.year})` : ""} · ` +
        `${b.chapters} chapters, ${b.chunks} passages${b.synthetic ? " · AI-GENERATED" : ""}`
    );
  }
  lines.push("");

  lines.push("WHAT THIS CORPUS DOES NOT CONTAIN");
  for (const l of s.limitations) lines.push(`  - ${l}`);
  lines.push("");

  lines.push("TOOL GUIDE");
  for (const g of s.toolGuide) {
    lines.push(`  ${g.tool}`);
    lines.push(`    answers well:  ${g.answersWell}`);
    lines.push(`    does not answer: ${g.doesNotAnswer}`);
  }

  return lines.join("\n");
}
