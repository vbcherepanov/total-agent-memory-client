# @vbch/total-agent-memory-client

[![npm](https://img.shields.io/npm/v/@vbch/total-agent-memory-client.svg)](https://www.npmjs.com/package/@vbch/total-agent-memory-client)
[![license](https://img.shields.io/badge/license-MIT-fa4.svg)](LICENSE)
[![Donate](https://img.shields.io/badge/PayPal-Donate-00457C.svg?logo=paypal&logoColor=white)](https://PayPal.Me/vbcherepanov)

TypeScript / JavaScript client for [**total-agent-memory**](https://github.com/vbcherepanov/total-agent-memory) —
the local-first MCP memory layer for AI coding agents.

> **New in 0.2.0** (server **v8.0+** required): structured decisions with per-criterion scoring, an L1-L4 task state machine (`classifyTask` / `taskCreate` / `phaseTransition`), progressive-disclosure retrieval (`mode: "index"` + `memoryGet`) that cuts typical recall tokens by 80-90%, intent capture, phase-scoped rules, LLM-compressed `sessionEnd`, and inline `<private>…</private>` redaction reporting.

> **Why use this?** If you're building in Node.js, Bun, Deno, or browsers and you want persistent,
> graph-aware memory that *learns how you work*, not just what you said — this is your client.
> 100% local by default. Temporal facts. Procedural workflows. Cross-project analogy.
> See the engine [feature matrix vs mem0 / Letta / Zep / Supermemory](https://github.com/vbcherepanov/total-agent-memory/blob/main/docs/vs-competitors.md).

## Install

```bash
npm i @vbch/total-agent-memory-client
# peerless — bundles @modelcontextprotocol/sdk
```

You also need the server running. One-line install:

```bash
curl -fsSL https://raw.githubusercontent.com/vbcherepanov/total-agent-memory/main/install.sh | bash
```

## Quick start (stdio — local MCP subprocess)

```ts
import { connectStdio } from "@vbch/total-agent-memory-client";

const memory = await connectStdio();

// resume where you left off
const { summary, next_steps } = await memory.sessionInit("my-project");

// remember a decision
await memory.save({
  type: "decision",
  content: "Chose pgvector over ChromaDB for multi-tenant RLS.",
  context: "Why: single DB, per-tenant row-level security.",
  project: "my-project",
  tags: ["database"],
});

// recall it later (or from a different process, or next month)
const hits = await memory.recallFlat({
  query: "vector store choice",
  project: "my-project",
  limit: 5,
});
```

## Quick start (HTTP — remote gateway)

Works against the dashboard HTTP gateway (total-agent-memory v7.1+):

```ts
import { connectHttp } from "@vbch/total-agent-memory-client";

const memory = connectHttp({
  baseUrl: "http://127.0.0.1:37737",
  token: process.env.MEMORY_TOKEN, // optional
});

const stats = await memory.stats();
console.log(stats.knowledge.active, "records across", Object.keys(stats.by_project).length, "projects");
```

## What you get over mem0 / Zep / Supermemory SDKs

| Capability | mem0 JS | Zep JS | Supermemory JS | **this** |
|---|:-:|:-:|:-:|:-:|
| Local-first (no network) | ❌ | ❌ | ❌ | ✅ stdio |
| Semantic + BM25 + graph hybrid | 🟡 | ✅ | ✅ | ✅ 6-tier |
| Temporal facts (`kg_at`) | ❌ | ✅ | ❌ | ✅ |
| **Procedural memory** (`workflow_predict`) | ❌ | ❌ | ❌ | ✅ |
| **Cross-project analogy** (`analogize`) | ❌ | ❌ | ❌ | ✅ |
| **Pre-edit risk warnings** (`file_context`) | ❌ | ❌ | ❌ | ✅ |
| **AST codebase ingest** (`ingest_codebase`) | ❌ | ❌ | ❌ | ✅ |
| Strict TypeScript types for all tools | 🟡 | 🟡 | 🟡 | ✅ |

## API surface

### Session lifecycle
- `sessionInit(project)` → resume previous session's summary + next steps
- `sessionEnd({ summary, next_steps, pitfalls })`

### Core memory
- `save({ type, content, context?, project?, tags?, branch? })`
- `recall({ query, project?, limit?, rerank?, diverse?, … })`
- `recallFlat(input)` — flattened, RRF-sorted list

### v7 tools
- `fileContext(path)` — risk score + past-error warnings for a file
- `learnError({ file, error, root_cause, fix, pattern })` — auto-consolidates into rules at N≥3
- `analogize({ query, exclude_project? })` — cross-project pattern match
- `kgAddFact({ subject, predicate, object, valid_from? })` — append-only temporal KG
- `kgAt(timestamp)` — point-in-time fact snapshot
- `workflowPredict(task_description)` — procedural prediction with confidence
- `workflowTrack(workflow_id, outcome)` — close the loop after task completion
- `ingestCodebase({ path, languages? })` — AST indexing via tree-sitter (9 langs)

### v8 tools (requires server 8.0+)
- `classifyTask(description, project?)` — L1-L4 classifier, returns suggested phases + confidence
- `taskCreate(taskId, description, level?)` — open a task in the state machine
- `phaseTransition(taskId, newPhase, artifacts?, notes?)` — step through `van` → `plan` → `creative` → `build` → `reflect` → `archive`
- `taskPhasesList(taskId)` — full phase timeline for a task
- `saveDecision({ title, options, criteria_matrix, selected, rationale })` — structured decisions with per-criterion scoring, indexed for recall
- `memoryRecall({ mode: "index" })` + `memoryGet(ids, detail?)` — **progressive-disclosure retrieval**: cheap index scan → targeted fetch. ~80-90% token savings on typical 20-hit queries vs. `mode: "search", detail: "full"`.
- `saveIntent` / `listIntents` / `searchIntents` — captured user prompts
- `ruleSetPhase(ruleId, phase)` — scope a rule to a task phase (or `null` for global)
- Extended `sessionEnd({ auto_compress, transcript })` — LLM-generated summary/next-steps from a raw transcript
- Extended `MemorySaveResult.privacy_redacted_sections` — count of inline `<private>…</private>` sections stripped before storage

### Progressive disclosure in practice

```ts
// Layer 1: cheap index scan (id + title + preview per hit, ~50 tokens each)
const idx = await memory.memoryRecall({
  query: "database choice",
  mode: "index",
  limit: 20,
});

// Layer 2: agent picks what's worth the full body
const keepIds = (idx.index_results ?? []).slice(0, 3).map((r) => r.id);
const full = await memory.memoryGet(keepIds, "full");
```

### Introspection
- `stats()` — active knowledge, projects, storage, queues
- `benchmark()` — reproducible R@k + latency eval

## Integrations

- **LangChain JS** — [`examples/langchain-adapter.ts`](examples/langchain-adapter.ts)
- **Vercel AI SDK** — wire `memory_save` as a tool in your agent loop
- **LlamaIndex TS** — implement `BaseMemory` around `save`/`recallFlat`
- **CrewAI / AutoGen (Python peers)** — use the Python client directly

## Privacy

This client spawns a local subprocess (stdio) or calls a locally-bound HTTP port.
No data is sent to any cloud service unless you configure the server to use one
(the default `nomic-embed-text` via Ollama is also fully local).

## License

MIT. See [LICENSE](LICENSE).
