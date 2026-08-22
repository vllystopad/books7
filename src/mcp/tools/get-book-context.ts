// MCP tool: get-book-context
import { z } from "zod";
import {
  SYNTHETIC_TOOL_DESCRIPTION_SUFFIX,
  SYNTHETIC_TOOL_WARNING,
} from "@/src/core/books/entities";
import { getBookContext } from "@/src/core/books/get-book-context";
import { MAX_TOKEN_LIMIT, MIN_TOKEN_LIMIT, DEFAULT_TOKEN_LIMIT } from "@/src/lib/constants";
import type { McpTool } from "@/src/mcp/types";

const Args = z.object({
  slug: z.string().min(1),
  topic: z.string().min(1).optional(),
  tokenLimit: z.number().int().min(MIN_TOKEN_LIMIT).max(MAX_TOKEN_LIMIT).optional(),
});

export const getBookContextTool: McpTool = {
  name: "get_book_context",
  description: [
    "Read grounded passages from ONE book you already have the slug for, optionally narrowed to a topic.",
    "Prefer this over search_books when the user names a specific book; prefer search_books when they name a subject.",
    "Returns an outcome label on the first line: OK, BOOK_NOT_IN_CORPUS, BOOK_NOT_INGESTED, NO_MATCH_FOR_TOPIC, or CAPPED.",
    "Does NOT answer: 'which books discuss X' — use search_books for that.",
    SYNTHETIC_TOOL_DESCRIPTION_SUFFIX,
  ].join(" "),
  inputSchema: {
    type: "object",
    properties: {
      slug: { type: "string", description: "Book slug from resolve_book_id or list_books" },
      topic: {
        type: "string",
        description:
          "Optional. Narrow to passages about this topic. Omit to read from the start of the book.",
      },
      tokenLimit: {
        type: "integer",
        description: `Maximum tokens of passage text to return (default ${DEFAULT_TOKEN_LIMIT})`,
        minimum: MIN_TOKEN_LIMIT,
        maximum: MAX_TOKEN_LIMIT,
        default: DEFAULT_TOKEN_LIMIT,
      },
    },
    required: ["slug"],
    additionalProperties: false,
  },
  examples: {
    answersWell: "What does The Cost of Being Sure say about waiting?",
    doesNotAnswer: "Which books mention waiting? — use search_books.",
  },
  execute: async (raw) => {
    const parsed = Args.safeParse(raw);
    if (!parsed.success) {
      return {
        outcome: "INVALID_ARGUMENTS",
        message: `INVALID_ARGUMENTS\n${parsed.error.issues.map((i) => i.message).join("; ")}`,
        nextActions: ["Retry with a valid slug string."],
        data: null,
      };
    }

    const result = await getBookContext(parsed.data);

    // Wrap top and bottom so the warning survives truncation from either end.
    if (result.data?.synthetic) {
      return {
        ...result,
        message: `${result.outcome}\n${SYNTHETIC_TOOL_WARNING}\n${result.message
          .split("\n")
          .slice(1)
          .join("\n")}\n${SYNTHETIC_TOOL_WARNING}`,
      };
    }

    return result;
  },
};
