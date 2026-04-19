/**
 * v8 cloud-provider LLM config for the server.
 *
 * The client itself is always local — but the server behind it can be routed
 * to OpenAI / Anthropic / Mistral / ... via env vars on the spawned subprocess.
 * You can even split providers per pipeline phase (cheap model for triple
 * extraction, quality model for enrichment).
 *
 *   $ export OPENAI_API_KEY=...
 *   $ export ANTHROPIC_API_KEY=...
 *   $ tsx examples/cloud-providers.ts
 */
import { connectStdio } from "../src/index.js";

async function main() {
  const memory = await connectStdio({
    env: {
      // baseline: everything routes to OpenAI gpt-4o-mini
      MEMORY_LLM_PROVIDER: "openai",
      MEMORY_LLM_API_KEY: process.env.OPENAI_API_KEY ?? "",
      MEMORY_LLM_MODEL: "gpt-4o-mini",
      // per-phase override: enrichment uses Claude for quality
      MEMORY_ENRICH_PROVIDER: "anthropic",
      MEMORY_ENRICH_API_KEY: process.env.ANTHROPIC_API_KEY ?? "",
      MEMORY_ENRICH_MODEL: "claude-haiku-4-5",
    },
  });

  const saved = await memory.save({
    content: "cloud provider smoke test",
    type: "fact",
  });
  console.log(
    `saved id=${saved.id}, privacy_redacted=${saved.privacy_redacted_sections ?? 0}`,
  );

  await memory.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
