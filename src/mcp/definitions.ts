import { compareAuthorsPrompt } from "@/src/mcp/prompts/compare-authors";
import { listBooksPrompt } from "@/src/mcp/prompts/list-books";
import { summariseBookPrompt } from "@/src/mcp/prompts/summarise-book";
import { corpusSummaryProvider } from "@/src/mcp/resources/corpus-summary";
import { listBooksResource } from "@/src/mcp/resources/list-books";
import { describeCorpusTool } from "@/src/mcp/tools/describe-corpus";
import { getBookContextTool } from "@/src/mcp/tools/get-book-context";
import { listBooksTool } from "@/src/mcp/tools/list-books";
import { resolveBookIdTool } from "@/src/mcp/tools/resolve-book-id";
import { searchBooksTool } from "@/src/mcp/tools/search-books";
import type {
  McpPrompt,
  McpPromptSpec,
  McpResource,
  McpResourceProvider,
  McpTool,
  McpToolSpec,
} from "@/src/mcp/types";

/**
 * Generic, reusable MCP plumbing.
 *
 * Use-case logic lives in `./resources`, `./prompts`, and `./tools`. This file
 * only assembles those registries and implements the protocol-level list, call,
 * and get operations, so the definitions the model is sent and the ones the
 * inspector renders cannot drift apart.
 */

// --- Registries -------------------------------------------------------

export const TOOL_REGISTRY: McpTool[] = [
  describeCorpusTool,
  listBooksTool,
  resolveBookIdTool,
  searchBooksTool,
  getBookContextTool,
];

export const PROMPT_REGISTRY: McpPrompt[] = [
  listBooksPrompt,
  compareAuthorsPrompt,
  summariseBookPrompt,
];

export const RESOURCE_PROVIDERS: McpResourceProvider[] = [
  corpusSummaryProvider,
  listBooksResource,
];

// --- Serializable specs (protocol list payloads) ---------------------

/** `tools/list` — specs with `execute` stripped. */
export const MCP_TOOLS: McpToolSpec[] = TOOL_REGISTRY.map(
  ({ name, description, inputSchema, examples }) => ({
    name,
    description,
    inputSchema,
    examples,
  })
);

/** `prompts/list` — specs with `render` stripped. */
export const MCP_PROMPTS: McpPromptSpec[] = PROMPT_REGISTRY.map(
  ({ name, description, arguments: args }) => ({
    name,
    description,
    arguments: args,
  })
);

// --- Protocol operations ---------------------------------------------

/** `resources/list` — flattens every registered provider. */
export async function listResources(): Promise<McpResource[]> {
  const batches = await Promise.all(RESOURCE_PROVIDERS.map((p) => p.list()));
  return batches.flat();
}

/** `tools/call` — dispatch by name. */
export async function executeTool(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const tool = TOOL_REGISTRY.find((t) => t.name === name);
  if (!tool) return { error: `Unknown tool: ${name}` };
  return tool.execute(args);
}

/** `prompts/get` — render by name. */
export async function renderPrompt(
  name: string,
  args: Record<string, unknown>
): Promise<{ name: string; description: string; content: string } | { error: string }> {
  const prompt = PROMPT_REGISTRY.find((p) => p.name === name);
  if (!prompt) return { error: `Unknown prompt: ${name}` };

  return {
    name: prompt.name,
    description: prompt.description,
    content: await prompt.render(args),
  };
}

/** Convert MCP tool specs into the shape the OpenAI chat API expects. */
export function toOpenAiTools(specs: McpToolSpec[] = MCP_TOOLS) {
  return specs.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.inputSchema,
    },
  }));
}

export type { McpPrompt, McpPromptSpec, McpResource, McpTool, McpToolSpec };
