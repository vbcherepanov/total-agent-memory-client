import { describe, expect, it } from "vitest";
import { MemoryClient } from "../src/client.js";
import type { ClientTransport } from "../src/types.js";

type Call = { tool: string; args: Record<string, unknown> };

function makeStub(
  responses: Record<string, unknown> = {},
): ClientTransport & { calls: Call[] } {
  const calls: Call[] = [];
  return {
    calls,
    async call<T>(tool: string, args: object): Promise<T> {
      calls.push({ tool, args: args as Record<string, unknown> });
      if (tool in responses) return responses[tool] as T;
      // Default: echo a sensible empty-ish shape so method signatures resolve.
      return {} as T;
    },
    async close() {},
  };
}

describe("MemoryClient v8 methods", () => {
  it("classifyTask routes to classify_task", async () => {
    const t = makeStub({
      classify_task: {
        level: 3,
        suggested_phases: ["van", "plan", "build"],
        estimated_tokens: 4200,
        rationale: "non-trivial refactor",
        confidence: 0.82,
        analogy: null,
      },
    });
    const c = new MemoryClient(t);
    const res = await c.classifyTask("refactor auth middleware", "demo");
    expect(res.level).toBe(3);
    expect(t.calls[0]).toEqual({
      tool: "classify_task",
      args: { description: "refactor auth middleware", project: "demo" },
    });
  });

  it("classifyTask omits project when not provided", async () => {
    const t = makeStub({ classify_task: { level: 1 } });
    const c = new MemoryClient(t);
    await c.classifyTask("hotfix typo");
    expect(t.calls[0]?.args).toEqual({ description: "hotfix typo" });
  });

  it("taskCreate routes to task_create with level", async () => {
    const t = makeStub({
      task_create: {
        task_id: "t-1",
        phase: "van",
        entered_at: "2026-04-19T10:00:00Z",
        level: 3,
        allowed_phases: ["van", "plan", "build", "reflect"],
      },
    });
    const c = new MemoryClient(t);
    const res = await c.taskCreate("t-1", "refactor", 3);
    expect(res.task_id).toBe("t-1");
    expect(t.calls[0]).toEqual({
      tool: "task_create",
      args: { task_id: "t-1", description: "refactor", level: 3 },
    });
  });

  it("phaseTransition routes to phase_transition with artifacts/notes", async () => {
    const t = makeStub({
      phase_transition: {
        task_id: "t-1",
        from_phase: "van",
        to_phase: "plan",
        entered_at: "2026-04-19T10:05:00Z",
        rules_preview: "",
      },
    });
    const c = new MemoryClient(t);
    await c.phaseTransition("t-1", "plan", { files: ["a.ts"] }, "scoped");
    expect(t.calls[0]).toEqual({
      tool: "phase_transition",
      args: {
        task_id: "t-1",
        new_phase: "plan",
        artifacts: { files: ["a.ts"] },
        notes: "scoped",
      },
    });
  });

  it("taskPhasesList routes to task_phases_list", async () => {
    const t = makeStub({ task_phases_list: { phases: [] } });
    const c = new MemoryClient(t);
    const res = await c.taskPhasesList("t-1");
    expect(res.phases).toEqual([]);
    expect(t.calls[0]).toEqual({
      tool: "task_phases_list",
      args: { task_id: "t-1" },
    });
  });

  it("saveDecision forwards structured payload verbatim", async () => {
    const t = makeStub({
      save_decision: { saved: true, id: 101, structured: true },
    });
    const c = new MemoryClient(t);
    const input = {
      title: "Cache layer",
      options: [{ name: "redis" }, { name: "memcached" }],
      criteria_matrix: {
        latency: { redis: 5, memcached: 5 },
        features: { redis: 5, memcached: 2 },
      },
      selected: "redis",
      rationale: "pubsub + scripting",
    };
    const res = await c.saveDecision(input);
    expect(res.structured).toBe(true);
    expect(t.calls[0]).toEqual({ tool: "save_decision", args: input });
  });

  it("memoryGet uses 'full' detail by default", async () => {
    const t = makeStub({
      memory_get: { total: 2, detail: "full", results: [] },
    });
    const c = new MemoryClient(t);
    await c.memoryGet([1, 2]);
    expect(t.calls[0]).toEqual({
      tool: "memory_get",
      args: { ids: [1, 2], detail: "full" },
    });
  });

  it("memoryGet honors explicit detail=summary", async () => {
    const t = makeStub({
      memory_get: { total: 0, detail: "summary", results: [] },
    });
    const c = new MemoryClient(t);
    await c.memoryGet([7], "summary");
    expect(t.calls[0]?.args).toEqual({ ids: [7], detail: "summary" });
  });

  it("saveIntent routes to save_intent with all fields", async () => {
    const t = makeStub({ save_intent: { saved: true, id: 9 } });
    const c = new MemoryClient(t);
    await c.saveIntent("build a login page", "sess-1", "demo");
    expect(t.calls[0]).toEqual({
      tool: "save_intent",
      args: { prompt: "build a login page", session_id: "sess-1", project: "demo" },
    });
  });

  it("listIntents maps sessionId -> session_id in payload", async () => {
    const t = makeStub({ list_intents: { items: [], count: 0 } });
    const c = new MemoryClient(t);
    await c.listIntents({ project: "demo", sessionId: "sess-1", limit: 5 });
    expect(t.calls[0]).toEqual({
      tool: "list_intents",
      args: { project: "demo", session_id: "sess-1", limit: 5 },
    });
  });

  it("searchIntents defaults limit to 20", async () => {
    const t = makeStub({ search_intents: { items: [], count: 0 } });
    const c = new MemoryClient(t);
    await c.searchIntents("auth");
    expect(t.calls[0]).toEqual({
      tool: "search_intents",
      args: { query: "auth", limit: 20 },
    });
  });

  it("ruleSetPhase forwards rule_id and phase (null allowed)", async () => {
    const t = makeStub({
      rule_set_phase: { rule_id: 3, phase: null, updated: true },
    });
    const c = new MemoryClient(t);
    await c.ruleSetPhase(3, null);
    expect(t.calls[0]).toEqual({
      tool: "rule_set_phase",
      args: { rule_id: 3, phase: null },
    });
  });

  // -- extended existing methods --------------------------------------------

  it("memoryRecall forwards v8 mode/decisions_only/neighbors", async () => {
    const t = makeStub({
      memory_recall: {
        query: "q",
        total: 0,
        detail: "full",
        fusion: "rrf",
        results: {},
        tiers_used: [],
      },
    });
    const c = new MemoryClient(t);
    await c.memoryRecall({
      query: "q",
      mode: "index",
      decisions_only: true,
      neighbors: 2,
      limit: 20,
    });
    expect(t.calls[0]).toEqual({
      tool: "memory_recall",
      args: {
        query: "q",
        mode: "index",
        decisions_only: true,
        neighbors: 2,
        limit: 20,
      },
    });
  });

  it("sessionEnd forwards auto_compress and transcript", async () => {
    const t = makeStub({ session_end: { saved: true, id: "sess-9" } });
    const c = new MemoryClient(t);
    await c.sessionEnd({
      summary: "",
      auto_compress: true,
      transcript: "full log…",
    });
    expect(t.calls[0]).toEqual({
      tool: "session_end",
      args: { summary: "", auto_compress: true, transcript: "full log…" },
    });
  });

  it("saveKnowledge exposes privacy_redacted_sections in response", async () => {
    const t = makeStub({
      memory_save: { saved: true, id: 1, deduplicated: false, privacy_redacted_sections: 2 },
    });
    const c = new MemoryClient(t);
    const res = await c.save({ content: "x <private>y</private>", type: "fact" });
    expect(res.privacy_redacted_sections).toBe(2);
  });
});
