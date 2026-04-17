import type {
  AnalogizeInput,
  BenchmarkResult,
  ClientTransport,
  FileContextResult,
  LearnErrorInput,
  MemoryRecallInput,
  MemoryRecallResult,
  MemorySaveInput,
  MemorySaveResult,
  MemoryStats,
  RecalledRecord,
  SessionInitResult,
  WorkflowPrediction,
} from "./types.js";

/**
 * High-level client for total-agent-memory.
 * Transport-agnostic: pass either a StdioTransport (local MCP subprocess)
 * or an HttpTransport (remote dashboard gateway).
 */
export class MemoryClient {
  constructor(private readonly transport: ClientTransport) {}

  // -- session lifecycle -----------------------------------------------------

  async sessionInit(project = "general"): Promise<SessionInitResult> {
    return this.transport.call("session_init", { project });
  }

  async sessionEnd(args: {
    summary: string;
    next_steps?: string[];
    pitfalls?: string[];
    highlights?: string[];
    project?: string;
  }): Promise<{ saved: boolean; id: string }> {
    return this.transport.call("session_end", args);
  }

  // -- core memory -----------------------------------------------------------

  async save(input: MemorySaveInput): Promise<MemorySaveResult> {
    return this.transport.call("memory_save", input);
  }

  async recall(input: MemoryRecallInput): Promise<MemoryRecallResult> {
    return this.transport.call("memory_recall", input);
  }

  /**
   * Flatten recall into a single ranked list across types.
   * Convenient when the caller doesn't need the bucket structure.
   */
  async recallFlat(input: MemoryRecallInput): Promise<RecalledRecord[]> {
    const res = await this.recall(input);
    const all: RecalledRecord[] = [];
    for (const bucket of Object.values(res.results)) {
      if (Array.isArray(bucket)) all.push(...bucket);
    }
    return all.sort((a, b) => (b.rrf_score ?? b.score) - (a.rrf_score ?? a.score));
  }

  // -- v7.0 tool surface -----------------------------------------------------

  async fileContext(path: string): Promise<FileContextResult> {
    return this.transport.call("file_context", { path });
  }

  async learnError(input: LearnErrorInput): Promise<{ saved: boolean; id: number }> {
    return this.transport.call("learn_error", input);
  }

  async analogize(input: AnalogizeInput): Promise<{
    query: string;
    excluded: string | null;
    matches: Array<RecalledRecord & { analogy_score: number }>;
  }> {
    return this.transport.call("analogize", input);
  }

  async kgAddFact(args: {
    subject: string;
    predicate: string;
    object: string;
    valid_from?: string;
    project?: string;
  }): Promise<{ id: string }> {
    return this.transport.call("kg_add_fact", args);
  }

  async kgAt(timestamp: string): Promise<Array<{
    subject: string;
    predicate: string;
    object: string;
    valid_from: string;
    valid_to: string | null;
  }>> {
    return this.transport.call("kg_at", { timestamp });
  }

  async workflowPredict(taskDescription: string): Promise<WorkflowPrediction> {
    return this.transport.call("workflow_predict", {
      task_description: taskDescription,
    });
  }

  async workflowTrack(workflow_id: string, outcome: "success" | "failure"): Promise<{
    updated: boolean;
  }> {
    return this.transport.call("workflow_track", { workflow_id, outcome });
  }

  async ingestCodebase(args: {
    path: string;
    languages?: string[];
    project?: string;
  }): Promise<{ files_indexed: number; symbols: number }> {
    return this.transport.call("ingest_codebase", args);
  }

  // -- introspection ---------------------------------------------------------

  async stats(): Promise<MemoryStats> {
    return this.transport.call("memory_stats", {});
  }

  async benchmark(scenariosPath?: string): Promise<BenchmarkResult> {
    return this.transport.call(
      "benchmark",
      scenariosPath ? { scenarios_path: scenariosPath } : {},
    );
  }

  async close(): Promise<void> {
    await this.transport.close();
  }
}
