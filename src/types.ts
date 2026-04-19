/**
 * Public types for @vbch/total-agent-memory-client
 * Mirrors the MCP tool surface of total-agent-memory v8.x.
 */

export type KnowledgeType =
  | "decision"
  | "fact"
  | "solution"
  | "lesson"
  | "convention";

export interface MemorySaveInput {
  content: string;
  type: KnowledgeType;
  project?: string;
  tags?: string[];
  context?: string;
  branch?: string;
  filter?:
    | "pytest"
    | "cargo"
    | "git_status"
    | "docker_ps"
    | "generic_logs";
}

export interface MemorySaveResult {
  saved: boolean;
  id: number;
  deduplicated: boolean;
  /** v8: count of `<private>…</private>` sections redacted before storage. */
  privacy_redacted_sections?: number;
}

/**
 * Recall mode (v8+).
 * - `search` (default): full semantic+lexical+graph fusion, returns content.
 * - `index`: token-efficient — returns id + title/preview only (Layer 1 of
 *   progressive disclosure). Pair with {@link MemoryClient.memoryGet}.
 * - `timeline`: chronological neighbours around matches (uses `neighbors`).
 */
export type RecallMode = "search" | "index" | "timeline";

export interface MemoryRecallInput {
  query: string;
  project?: string;
  branch?: string;
  type?: KnowledgeType | "all";
  limit?: number;
  detail?: "compact" | "summary" | "full" | "auto";
  rerank?: boolean;
  diverse?: boolean;
  fusion?: "rrf" | "legacy";
  entities?: string[];
  topics?: string[];
  intent?: string;
  expand_context?: boolean;
  expand_budget?: number;
  /** v8: retrieval mode. Default `"search"`. */
  mode?: RecallMode;
  /** v8: filter to structured decisions only. */
  decisions_only?: boolean;
  /** v8: chronological neighbours to include in `timeline` mode. */
  neighbors?: number;
}

export interface RecalledRecord {
  id: number;
  content: string;
  context?: string;
  project: string;
  tags: string[];
  confidence: number;
  created_at: string;
  session_id?: string;
  score: number;
  via: string[];
  recall_count: number;
  decay: number;
  rrf_score?: number;
}

export interface MemoryRecallResult {
  query: string;
  total: number;
  detail: string;
  fusion: string;
  total_tokens?: number;
  results: Record<string, RecalledRecord[]>;
  tiers_used: string[];
  /** v8: present when `mode="index"` — index entries flattened for convenience. */
  index_results?: Array<{ id: number; type: string; title: string; preview?: string }>;
  /** v8: mode echo. */
  mode?: RecallMode;
}

export interface SessionInitResult {
  id: string;
  session_id: string;
  project: string;
  branch: string | null;
  summary: string;
  highlights: string[];
  pitfalls: string[];
  next_steps: string[];
  open_questions: string[];
  context_blob: string | null;
  started_at: string | null;
  ended_at: string | null;
  consumed: number;
  created_at: string;
}

export interface WorkflowPrediction {
  workflow_id: string;
  confidence: number;
  predicted_steps: string[];
  similar_past: Array<{ id: number; outcome: string; similarity: number }>;
}

export interface FileContextResult {
  path: string;
  risk_score: number;
  warnings: string[];
  hot_spots: string[];
  recent_errors: Array<{ pattern: string; fix: string; count: number }>;
}

export interface LearnErrorInput {
  file?: string;
  error: string;
  root_cause: string;
  fix: string;
  pattern: string;
  project?: string;
}

export interface AnalogizeInput {
  query: string;
  exclude_project?: string;
  limit?: number;
}

export interface BenchmarkResult {
  total: number;
  passed: number;
  failed: number;
  recall: {
    total: number;
    passed: number;
    r_at_1: number;
    r_at_5: number;
    r_at_10: number;
  };
  prevention: { total: number; passed: number; rate: number };
  latency: {
    mean_ms: number;
    p50_ms: number;
    p95_ms: number;
    max_ms: number;
  };
  scenarios: Array<Record<string, unknown>>;
}

export interface MemoryStats {
  sessions: number;
  knowledge: {
    active: number;
    archived: number;
    consolidated: number;
    superseded: number;
  };
  by_type: Record<string, number>;
  by_project: Record<string, number>;
  storage_mb: Record<string, number>;
  [key: string]: unknown;
}

export interface ClientTransport {
  call<T = unknown>(tool: string, args: object): Promise<T>;
  close(): Promise<void>;
}

// -- v8.0 additions ----------------------------------------------------------

/** Task complexity level (v8 state machine). */
export type TaskLevel = 1 | 2 | 3 | 4;

/** Phase in the v8 task state machine. */
export type TaskPhase =
  | "van"
  | "plan"
  | "creative"
  | "build"
  | "reflect"
  | "archive";

export interface ClassifyTaskResult {
  level: TaskLevel;
  suggested_phases: TaskPhase[];
  estimated_tokens: number;
  rationale: string;
  confidence: number;
  /** Optional analogical reference from past tasks (id or short description). */
  analogy: string | null;
}

export interface TaskCreateResult {
  task_id: string;
  phase: TaskPhase;
  /** ISO-8601 UTC timestamp when the task entered its initial phase. */
  entered_at: string;
  level: TaskLevel;
  /** Phases the task may legally transition into (computed from level). */
  allowed_phases: TaskPhase[];
}

export interface PhaseTransitionResult {
  task_id: string;
  from_phase: TaskPhase;
  to_phase: TaskPhase;
  entered_at: string;
  /** Short markdown preview of the rules bundle scoped to the new phase. */
  rules_preview: string;
}

export interface TaskPhaseRow {
  task_id: string;
  phase: TaskPhase;
  entered_at: string;
  exited_at: string | null;
  notes: string | null;
  artifacts: Record<string, unknown> | null;
}

// -- decisions ---------------------------------------------------------------

export interface DecisionOption {
  name: string;
  pros?: string[];
  cons?: string[];
  unknowns?: string[];
}

/**
 * Criterion → (option name → score).
 * Both keys are free-form strings; option names must match
 * {@link DecisionOption.name} entries in the same payload.
 */
export type CriteriaMatrix = Record<string, Record<string, number>>;

export interface SaveDecisionInput {
  title: string;
  options: DecisionOption[];
  criteria_matrix: CriteriaMatrix;
  /** Name of the selected option. Must appear in `options[].name`. */
  selected: string;
  rationale: string;
  /** Explicitly discarded option names (optional — defaults to all-but-selected). */
  discarded?: string[];
  project?: string;
  tags?: string[];
}

export interface SaveDecisionResult {
  saved: boolean;
  id: number;
  /** Literal `true` — distinguishes structured decisions from plain saves. */
  structured: true;
}

// -- intents -----------------------------------------------------------------

export interface Intent {
  id: number;
  session_id: string | null;
  project: string | null;
  prompt: string;
  /** ISO-8601 UTC. */
  created_at: string;
  turn_index: number;
  prompt_hash: string;
}

// -- memory_get --------------------------------------------------------------

export interface MemoryGetRecord {
  id: number;
  type: string;
  content: string;
  context?: string | null;
  project?: string | null;
  tags: string[];
  created_at: string;
  session_id?: string | null;
}

export interface MemoryGetResult {
  total: number;
  detail: string;
  results: MemoryGetRecord[];
}

// -- rule_set_phase ----------------------------------------------------------

export interface RuleSetPhaseResult {
  rule_id: number;
  phase: TaskPhase | null;
  updated: boolean;
  error?: string;
}

// -- extended session_end ----------------------------------------------------

export interface SessionEndInput {
  summary: string;
  next_steps?: string[];
  pitfalls?: string[];
  highlights?: string[];
  project?: string;
  /** v8: when true, server generates summary/next_steps from transcript via LLM. */
  auto_compress?: boolean;
  /** v8: raw transcript fed to the compressor when `auto_compress` is true. */
  transcript?: string;
}

export interface SessionEndResult {
  saved: boolean;
  id: string;
}
