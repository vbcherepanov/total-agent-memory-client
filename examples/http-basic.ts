/**
 * HTTP gateway example (requires total-agent-memory v7.1+ dashboard).
 *
 *   $ node --loader tsx examples/http-basic.ts
 */
import { connectHttp } from "../src/index.js";

async function main() {
  const memory = connectHttp({
    baseUrl: process.env.MEMORY_URL ?? "http://127.0.0.1:37737",
    token: process.env.MEMORY_TOKEN,
  });

  const stats = await memory.stats();
  console.log("knowledge active:", stats.knowledge.active);
  console.log("projects:", Object.keys(stats.by_project).length);

  const hits = await memory.recallFlat({
    query: "temporal knowledge graph",
    limit: 3,
  });
  for (const h of hits) {
    console.log(`  [${h.score.toFixed(2)}] ${h.content.slice(0, 80)}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
