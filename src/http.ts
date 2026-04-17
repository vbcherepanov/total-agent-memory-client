import type { ClientTransport } from "./types.js";
import { MemoryClient } from "./client.js";

export interface HttpOptions {
  /**
   * Base URL of the total-agent-memory dashboard HTTP gateway.
   * Defaults to http://127.0.0.1:37737 (the built-in dashboard port).
   */
  baseUrl?: string;
  /** Optional bearer token for authenticated gateways. */
  token?: string;
  /** Request timeout in milliseconds. */
  timeoutMs?: number;
  /** Custom fetch implementation (e.g. for testing). */
  fetchImpl?: typeof fetch;
}

/**
 * Connect to a running total-agent-memory instance over HTTP.
 *
 * The dashboard exposes read endpoints (`/api/stats`, `/api/knowledge`, etc.).
 * For write tools (`memory_save`, `learn_error`, …) the dashboard forwards to
 * the MCP JSON-RPC endpoint at `/api/mcp/call` (v7.1+).
 *
 * On older servers, the transport will throw a helpful error and suggest
 * `connectStdio()` instead.
 */
export function connectHttp(options: HttpOptions = {}): MemoryClient {
  const baseUrl = (options.baseUrl ?? "http://127.0.0.1:37737").replace(/\/$/, "");
  const timeoutMs = options.timeoutMs ?? 30_000;
  const fetchImpl = options.fetchImpl ?? fetch;
  const headers: Record<string, string> = {
    "content-type": "application/json",
    accept: "application/json",
  };
  if (options.token) headers.authorization = `Bearer ${options.token}`;

  const transport: ClientTransport = {
    async call<T>(tool: string, args: object): Promise<T> {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetchImpl(`${baseUrl}/api/mcp/call`, {
          method: "POST",
          headers,
          body: JSON.stringify({ tool, args }),
          signal: controller.signal,
        });
        if (!res.ok) {
          const body = await res.text().catch(() => "");
          if (res.status === 404) {
            throw new Error(
              `HTTP gateway does not expose /api/mcp/call (status 404). ` +
                `Upgrade total-agent-memory to v7.1+, or use connectStdio() for local access.`,
            );
          }
          throw new Error(
            `tool ${tool} failed: HTTP ${res.status} ${res.statusText} — ${body}`,
          );
        }
        return (await res.json()) as T;
      } finally {
        clearTimeout(timer);
      }
    },
    async close() {
      // HTTP has nothing to close.
    },
  };

  return new MemoryClient(transport);
}
