# Changelog

All notable changes to this package are documented here. The format loosely
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this
project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] — 2026-04-19

### Added
- **Task workflow** — `classifyTask`, `taskCreate`, `phaseTransition`, `taskPhasesList` for the L1-L4 state machine (`van` / `plan` / `creative` / `build` / `reflect` / `archive`).
- **Structured decisions** — `saveDecision({ title, options, criteria_matrix, selected, rationale, discarded? })` with per-criterion scoring, indexed so `memoryRecall({ decisions_only: true })` works.
- **Progressive disclosure** — `memoryGet(ids, detail?)` pairs with `memoryRecall({ mode: "index" })` for a 3-layer retrieval funnel (~80-90% token savings on typical 20-hit queries).
- **Intents** — `saveIntent`, `listIntents`, `searchIntents` expose the `intent` rows captured from `UserPromptSubmit`.
- **Phase-scoped rules** — `ruleSetPhase(ruleId, phase)` manages the `phase:X` tag for lazy rule loading (pass `null` to unscope).
- **Extended `memoryRecall`** — `mode` (`"search" | "index" | "timeline"`), `decisions_only`, `neighbors`.
- **Extended `sessionEnd`** — `auto_compress`, `transcript` (LLM-generated summary / next steps).
- **Extended `MemorySaveResult`** — `privacy_redacted_sections` count from inline `<private>…</private>` redaction.
- **`memoryRecall` alias** — added alongside `recall()` to match the `memoryGet` naming.
- **New types** — `TaskLevel`, `TaskPhase`, `ClassifyTaskResult`, `TaskCreateResult`, `PhaseTransitionResult`, `TaskPhaseRow`, `DecisionOption`, `CriteriaMatrix`, `SaveDecisionInput`, `SaveDecisionResult`, `Intent`, `MemoryGetRecord`, `MemoryGetResult`, `RecallMode`, `RuleSetPhaseResult`, `SessionEndInput`, `SessionEndResult`.

### Examples
- `examples/task-workflow.ts` — classify → create task → transition → record decision.
- `examples/progressive-disclosure.ts` — index-then-fetch retrieval pattern.
- `examples/cloud-providers.ts` — per-phase LLM provider routing via env vars.

### Server compatibility
- Requires `total-agent-memory` server **v8.0.0 or later** for v8 methods.
- Fully backward-compatible with v7.x for all previously shipped methods; new methods will throw "tool not found" against older servers.

## [0.1.1]
- Initial npm publish (v7.0 server compat).
