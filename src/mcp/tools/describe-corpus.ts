// MCP tool: describe-corpus — the tools-only path to the corpus self-description.
import { ok } from "@/src/core/books/outcomes";
import { buildCorpusSummary, renderCorpusSummary } from "@/src/mcp/corpus-summary";
import type { McpTool } from "@/src/mcp/types";

export const describeCorpusTool: McpTool = {
  name: "describe_corpus",
  description: [
    "Report what this corpus actually contains: counts, publication range, which books are readable,",
    "which are metadata-only, whether a topic taxonomy exists, and an explicit list of what is NOT here.",
    "Call this FIRST when the user asks what they can ask about, or before assuming a subject is covered —",
    "every figure is read from the database, so it is authoritative where your own assumptions are not.",
    "Does NOT answer: 'what does book X say about Y' — use get_book_context for that.",
  ].join(" "),
  inputSchema: {
    type: "object",
    properties: {
      format: {
        type: "string",
        enum: ["text", "json"],
        description: "text for a readable briefing, json for structured fields. Default text.",
        default: "text",
      },
    },
    required: [],
    additionalProperties: false,
  },
  examples: {
    answersWell: "What can I ask you about?",
    doesNotAnswer: "Summarise chapter 3 of The Second Chair — use get_book_context.",
  },
  execute: async (args) => {
    const summary = await buildCorpusSummary();
    const format = args.format === "json" ? "json" : "text";

    const detail =
      format === "json"
        ? `Corpus described from live database counts: ${summary.totalBooks} records, ` +
          `${summary.ingestedBookCount} readable, ${summary.totalChunks} passages.`
        : renderCorpusSummary(summary);

    return ok(detail, format === "json" ? summary : { text: renderCorpusSummary(summary) });
  },
};
