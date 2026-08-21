/** Shared MCP shapes. Lives apart from the registry so tool files can import
 *  the types without a circular dependency back through `definitions.ts`. */

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

export type McpPrompt = {
  name: string;
  description: string;
  arguments: { name: string; description: string; required: boolean }[];
};

export type McpResource = {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
};
