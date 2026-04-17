/**
 * Public types for @vbch/total-agent-memory-client
 * Mirrors the MCP tool surface of total-agent-memory v7.x.
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
}

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
