/** Shared MCP shapes. Lives apart from the registries so resource/prompt/tool
 *  files can import the types without a circular dependency back through
 *  `definitions.ts`. */

/* ------------------------------------------------------------------ */
/* Tools                                                               */
/* ------------------------------------------------------------------ */

export type McpTool = {
  name: string;
  description: string;
  /** JSON Schema for the tool's arguments, as sent to the model. */
  inputSchema: Record<string, unknown>;
  execute: (args: Record<string, unknown>) => Promise<unknown>;
};

/** The serializable half of a tool — what `tools/list` returns and what the
 *  agent inspector renders. Excludes `execute`. */
export type McpToolSpec = Omit<McpTool, "execute">;

/* ------------------------------------------------------------------ */
/* Resources                                                           */
/* ------------------------------------------------------------------ */

export type McpResource = {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
};

/** A named resource collection backed by a loader (usually a DB query). */
export type McpResourceProvider = {
  name: string;
  description: string;
  list: () => Promise<McpResource[]>;
};

/* ------------------------------------------------------------------ */
/* Prompts                                                             */
/* ------------------------------------------------------------------ */

export type McpPromptArgument = {
  name: string;
  description: string;
  required: boolean;
};

export type McpPrompt = {
  name: string;
  description: string;
  arguments: McpPromptArgument[];
  /** Renders the prompt body. May read resources, hence async. */
  render: (args: Record<string, unknown>) => Promise<string>;
};

/** The serializable half of a prompt — what `prompts/list` returns. */
export type McpPromptSpec = Omit<McpPrompt, "render">;
