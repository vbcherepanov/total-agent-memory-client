import { describe, expect, it, vi } from "vitest";
import { MemoryClient } from "../src/client.js";
import type { ClientTransport } from "../src/types.js";

function makeStubTransport(
  map: Record<string, unknown>,
): ClientTransport & { calls: Array<{ tool: string; args: unknown }> } {
  const calls: Array<{ tool: string; args: unknown }> = [];
  return {
    calls,
    async call<T>(tool: string, args: object): Promise<T> {
      calls.push({ tool, args });
      if (tool in map) return map[tool] as T;
      throw new Error(`no stub for ${tool}`);
    },
    async close() {},
  };
}

describe("MemoryClient", () => {
  it("forwards save() to the memory_save tool with unchanged args", async () => {
    const t = makeStubTransport({
      memory_save: { saved: true, id: 42, deduplicated: false },
    });
    const c = new MemoryClient(t);
    const res = await c.save({
      type: "decision",
      content: "hello",
      project: "demo",
    });
    expect(res).toEqual({ saved: true, id: 42, deduplicated: false });
    expect(t.calls[0]?.tool).toBe("memory_save");
    expect((t.calls[0]?.args as { content: string }).content).toBe("hello");
  });

  it("recallFlat flattens buckets and sorts by rrf_score then score", async () => {
    const t = makeStubTransport({
      memory_recall: {
        query: "q",
        total: 3,
        detail: "full",
        fusion: "rrf",
        results: {
          fact: [
            {
              id: 1,
              content: "low",
              project: "p",
              tags: [],
              confidence: 1,
              created_at: "",
              score: 0.2,
              via: [],
              recall_count: 0,
              decay: 1,
              rrf_score: 0.01,
            },
          ],
          solution: [
            {
              id: 2,
              content: "high",
              project: "p",
              tags: [],
              confidence: 1,
              created_at: "",
              score: 0.9,
              via: [],
              recall_count: 0,
              decay: 1,
              rrf_score: 0.05,
            },
            {
              id: 3,
              content: "mid",
              project: "p",
              tags: [],
              confidence: 1,
              created_at: "",
              score: 0.5,
              via: [],
              recall_count: 0,
              decay: 1,
              rrf_score: 0.03,
            },
          ],
        },
        tiers_used: ["fts"],
      },
    });
    const c = new MemoryClient(t);
    const flat = await c.recallFlat({ query: "q" });
    expect(flat.map((r) => r.id)).toEqual([2, 3, 1]);
  });

  it("routes workflow_predict through workflowPredict()", async () => {
    const t = makeStubTransport({
      workflow_predict: {
        workflow_id: "wf-1",
        confidence: 0.7,
        predicted_steps: ["read file", "patch", "test"],
        similar_past: [],
      },
    });
    const c = new MemoryClient(t);
    const pred = await c.workflowPredict("refactor auth");
    expect(pred.confidence).toBe(0.7);
    expect(t.calls[0]?.tool).toBe("workflow_predict");
    expect((t.calls[0]?.args as { task_description: string }).task_description)
      .toBe("refactor auth");
  });

  it("close() closes the transport exactly once", async () => {
    const closeFn = vi.fn(async () => {});
    const t: ClientTransport = {
      async call() {
        return {};
      },
      close: closeFn,
    };
    const c = new MemoryClient(t);
    await c.close();
    expect(closeFn).toHaveBeenCalledTimes(1);
  });
});
