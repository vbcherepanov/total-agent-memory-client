import type {
  AnalogizeInput,
  BenchmarkResult,
  ClassifyTaskResult,
  ClientTransport,
  FileContextResult,
  Intent,
  LearnErrorInput,
  MemoryGetResult,
  MemoryRecallInput,
  MemoryRecallResult,
  MemorySaveInput,
  MemorySaveResult,
  MemoryStats,
  PhaseTransitionResult,
  RecalledRecord,
  RuleSetPhaseResult,
  SaveDecisionInput,
  SaveDecisionResult,
  SessionEndInput,
  SessionEndResult,
  SessionInitResult,
  TaskCreateResult,
  TaskLevel,
  TaskPhase,
  TaskPhaseRow,
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

  async sessionEnd(args: SessionEndInput): Promise<SessionEndResult> {
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
   * Alias for {@link recall} matching the underlying MCP tool name.
   * Provided for naming-symmetry with the v8 `memory_get` pair.
   */
  async memoryRecall(input: MemoryRecallInput): Promise<MemoryRecallResult> {
    return this.recall(input);
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

  // -- v8.0 tool surface -----------------------------------------------------

  /**
   * Classify a task description into L1–L4 complexity + suggested phases.
   * Call this before {@link taskCreate} to pick the right `level`.
   */
  async classifyTask(
    description: string,
    project?: string,
  ): Promise<ClassifyTaskResult> {
    const args: { description: string; project?: string } = { description };
    if (project !== undefined) args.project = project;
    return this.transport.call("classify_task", args);
  }

  /**
   * Open a new task in the v8 state machine. Enters the default starting phase
   * for the given level (typically `"van"` for L3/L4, `"build"` for L1).
   */
  async taskCreate(
    taskId: string,
    description: string,
    level?: TaskLevel,
  ): Promise<TaskCreateResult> {
    const args: { task_id: string; description: string; level?: TaskLevel } = {
      task_id: taskId,
      description,
    };
    if (level !== undefined) args.level = level;
    return this.transport.call("task_create", args);
  }

  /**
   * Move a task from its current phase to `newPhase`. The server validates
   * the transition against the task's allowed phases.
   */
  async phaseTransition(
    taskId: string,
    newPhase: TaskPhase,
    artifacts?: Record<string, unknown>,
    notes?: string,
  ): Promise<PhaseTransitionResult> {
    const args: {
      task_id: string;
      new_phase: TaskPhase;
      artifacts?: Record<string, unknown>;
      notes?: string;
    } = { task_id: taskId, new_phase: newPhase };
    if (artifacts !== undefined) args.artifacts = artifacts;
    if (notes !== undefined) args.notes = notes;
    return this.transport.call("phase_transition", args);
  }

  /** List every phase the task has been in, ordered chronologically. */
  async taskPhasesList(taskId: string): Promise<{ phases: TaskPhaseRow[] }> {
    return this.transport.call("task_phases_list", { task_id: taskId });
  }

  /**
   * Save a structured decision with options, per-criterion scoring, and a
   * rationale. Indexed so `memory_recall(decisions_only: true)` works.
   */
  async saveDecision(input: SaveDecisionInput): Promise<SaveDecisionResult> {
    return this.transport.call("save_decision", input);
  }

  /**
   * Fetch full records by id. Pairs with `memoryRecall(mode: "index")` for
   * the progressive-disclosure workflow (cheap index → targeted fetch).
   */
  async memoryGet(
    ids: number[],
    detail: "summary" | "full" = "full",
  ): Promise<MemoryGetResult> {
    return this.transport.call("memory_get", { ids, detail });
  }

  /**
   * Record a user prompt as an `intent` row (v8 — normally captured via
   * UserPromptSubmit hook, but available for manual instrumentation).
   */
  async saveIntent(
    prompt: string,
    sessionId?: string,
    project?: string,
  ): Promise<{ saved: boolean; id: number }> {
    const args: { prompt: string; session_id?: string; project?: string } = {
      prompt,
    };
    if (sessionId !== undefined) args.session_id = sessionId;
    if (project !== undefined) args.project = project;
    return this.transport.call("save_intent", args);
  }

  /** List recent intents, newest first. */
  async listIntents(
    opts: { project?: string; sessionId?: string; limit?: number } = {},
  ): Promise<{ items: Intent[]; count: number }> {
    const args: { project?: string; session_id?: string; limit?: number } = {};
    if (opts.project !== undefined) args.project = opts.project;
    if (opts.sessionId !== undefined) args.session_id = opts.sessionId;
    if (opts.limit !== undefined) args.limit = opts.limit;
    return this.transport.call("list_intents", args);
  }

  /** Full-text search over captured intents. */
  async searchIntents(
    query: string,
    project?: string,
    limit = 20,
  ): Promise<{ items: Intent[]; count: number }> {
    const args: { query: string; project?: string; limit: number } = {
      query,
      limit,
    };
    if (project !== undefined) args.project = project;
    return this.transport.call("search_intents", args);
  }

  /**
   * Attach/detach a phase tag on a rule. Pass `null` to unscope (rule becomes
   * global again). Used by the dashboard rules editor.
   */
  async ruleSetPhase(
    ruleId: number,
    phase: TaskPhase | null,
  ): Promise<RuleSetPhaseResult> {
    return this.transport.call("rule_set_phase", {
      rule_id: ruleId,
      phase,
    });
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
