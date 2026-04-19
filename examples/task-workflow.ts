/**
 * v8 task workflow demo.
 * Classify -> create task -> step through phases -> record a structured decision.
 *
 *   $ npm run build
 *   $ tsx examples/task-workflow.ts
 */
import { connectStdio } from "../src/index.js";

async function main() {
  const memory = await connectStdio();

  // 1) classify the work first so we know which phases apply
  const cls = await memory.classifyTask(
    "refactor auth middleware to JWT rotation",
  );
  console.log(`Level ${cls.level}: ${cls.rationale}`);
  console.log(`Suggested phases: ${cls.suggested_phases.join(" -> ")}`);

  // 2) open a task in the state machine
  const task = await memory.taskCreate(
    "demo-task-1",
    "refactor auth middleware",
    cls.level,
  );
  console.log(`Task ${task.task_id} created in phase "${task.phase}"`);

  // 3) move through phases, attaching artifacts
  await memory.phaseTransition("demo-task-1", "plan", {
    files: ["src/auth/middleware.ts"],
  });

  // 4) record the key decision in structured form (indexed for recall)
  const dec = await memory.saveDecision({
    title: "JWT rotation strategy",
    options: [
      {
        name: "short-lived + refresh",
        pros: ["revocation easy"],
        cons: ["2 tokens"],
      },
      {
        name: "long-lived + blacklist",
        pros: ["simple"],
        cons: ["DB hit per request"],
      },
    ],
    criteria_matrix: {
      security: {
        "short-lived + refresh": 5,
        "long-lived + blacklist": 3,
      },
      performance: {
        "short-lived + refresh": 4,
        "long-lived + blacklist": 2,
      },
    },
    selected: "short-lived + refresh",
    rationale: "security outweighs added complexity",
    discarded: ["long-lived + blacklist"],
  });
  console.log(`Decision stored id=${dec.id} (structured=${dec.structured})`);

  // 5) inspect phase history
  const phases = await memory.taskPhasesList("demo-task-1");
  console.log(
    "Phase timeline:",
    phases.phases.map((p) => `${p.phase}@${p.entered_at}`),
  );

  await memory.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
