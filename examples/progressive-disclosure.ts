/**
 * v8 progressive-disclosure retrieval.
 *
 * The classic one-shot `memory_recall` pays the token cost of full content
 * for every hit — even the ones the agent won't end up using. The v8 pattern
 * is a 3-layer funnel:
 *
 *   Layer 1   recall(mode: "index")   ~50 tokens/hit, id + title + preview
 *   Layer 2   memoryGet([ids], "full") only for the ids worth reading
 *   Layer 3   (optional) neighbour expansion around a specific hit
 *
 * On typical queries this saves ~80-90% of retrieval tokens.
 *
 *   $ npm run build
 *   $ tsx examples/progressive-disclosure.ts
 */
import { connectStdio } from "../src/index.js";

async function main() {
  const memory = await connectStdio();

  // Layer 1 — cheap index scan
  const idx = await memory.memoryRecall({
    query: "database choice",
    mode: "index",
    limit: 20,
  });
  console.log(`Index returned ${idx.total} hits (mode=${idx.mode ?? "index"})`);

  // Caller decides which ids are worth the full body. Here: top-3.
  const candidates = idx.index_results ?? [];
  const interestingIds = candidates.slice(0, 3).map((r) => r.id);
  if (interestingIds.length === 0) {
    console.log("no hits; nothing to fetch");
    await memory.close();
    return;
  }

  // Layer 2 — single batched round-trip for full content
  const full = await memory.memoryGet(interestingIds, "full");
  for (const rec of full.results) {
    console.log(`#${rec.id} [${rec.type}] ${rec.content.slice(0, 80)}…`);
  }

  // vs. `memoryRecall({ limit: 20, detail: "full" })` this cuts ~80-90% of
  // retrieval tokens on a typical 20-hit query where only 2-3 matter.
  await memory.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
