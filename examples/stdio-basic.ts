/**
 * Basic stdio example.
 *
 *   $ npm run build
 *   $ node --loader tsx examples/stdio-basic.ts
 */
import { connectStdio } from "../src/index.js";

async function main() {
  const memory = await connectStdio({
    // uses "claude-total-memory" on PATH by default
    // command: "/path/to/bin/claude-total-memory",
  });

  // 1) resume context from previous session
  const init = await memory.sessionInit("demo-project");
  console.log("resume:", init.summary);
  console.log("next_steps:", init.next_steps);

  // 2) save a decision
  const saved = await memory.save({
    type: "decision",
    content: "Chose pgvector over ChromaDB for multi-tenant RLS.",
    context: "Why: single Postgres instance, RLS for tenant isolation.",
    project: "demo-project",
    tags: ["stack", "database"],
  });
  console.log("saved id:", saved.id);

  // 3) recall related knowledge
  const hits = await memory.recallFlat({
    query: "vector database choice",
    project: "demo-project",
    limit: 5,
  });
  for (const h of hits) {
    console.log(`  [${h.score.toFixed(2)}] ${h.content.slice(0, 80)}`);
  }

  // 4) v7 procedural memory: predict approach before diving in
  const pred = await memory.workflowPredict(
    "migrate auth middleware to JWT-only session tokens",
  );
  console.log(
    `workflow prediction (${pred.confidence.toFixed(2)}):`,
    pred.predicted_steps,
  );

  await memory.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
