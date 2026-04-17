import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { ClientTransport } from "./types.js";
import { MemoryClient } from "./client.js";

export interface StdioOptions {
  /**
   * Command to launch the total-agent-memory MCP server.
   * Default: "claude-total-memory" (assumes pip install console_scripts entry).
   */
  command?: string;
  /** Extra CLI args forwarded to the server process. */
  args?: string[];
  /** Extra environment variables for the subprocess. */
  env?: Record<string, string>;
  /** Working directory for the spawned process. */
  cwd?: string;
  /** Identifier sent to the server during handshake. Defaults to package name. */
  clientName?: string;
  clientVersion?: string;
}

/**
 * Connect to a local total-agent-memory MCP server via stdio.
 * Spawns the server as a child process and speaks JSON-RPC over its stdin/stdout.
 */
export async function connectStdio(
  options: StdioOptions = {},
): Promise<MemoryClient> {
  const transport = new StdioClientTransport({
    command: options.command ?? "claude-total-memory",
    args: options.args ?? [],
    env: { ...process.env, ...options.env } as Record<string, string>,
    ...(options.cwd !== undefined ? { cwd: options.cwd } : {}),
  });

  const client = new Client(
    {
      name: options.clientName ?? "@vbch/total-agent-memory-client",
      version: options.clientVersion ?? "0.1.0",
    },
    {
      capabilities: {},
    },
  );

  await client.connect(transport);

  const adapter: ClientTransport = {
    async call<T>(tool: string, args: object): Promise<T> {
      const res = await client.callTool({
        name: tool,
        arguments: args as Record<string, unknown>,
      });
      if (res.isError) {
        throw new Error(
          `tool ${tool} failed: ${JSON.stringify(res.content)}`,
        );
      }
      // MCP returns content as array of blocks; we expect one JSON/text block.
      const text = extractTextPayload(res.content);
      if (!text) return res as unknown as T;
      try {
        return JSON.parse(text) as T;
      } catch {
        return text as unknown as T;
      }
    },
    async close() {
      await client.close();
    },
  };

  return new MemoryClient(adapter);
}

function extractTextPayload(content: unknown): string | null {
  if (!Array.isArray(content)) return null;
  for (const block of content) {
    if (block && typeof block === "object" && "text" in block) {
      const text = (block as { text: unknown }).text;
      if (typeof text === "string") return text;
    }
  }
  return null;
}
