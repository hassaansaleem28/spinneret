/**
 * Spinneret scheduler daemon.
 *
 *   npm run watch              # default: every 30 minutes
 *   SPINNERET_CRON="*\/10 * * * *" npm run watch
 *
 * Runs the sentinel over the whole fleet on a cron schedule, healing only where
 * the evidence justifies it. This is the "schedule" downstream integration: the
 * Collector IDs are consumed by a long-running process, not a one-off script.
 */
import cron from "node-cron";
import { COLLECTORS } from "@/config/collectors";
import * as repo from "@/db/repositories";
import { tick } from "@/services/scheduler";

const SCHEDULE = process.env.SPINNERET_CRON ?? "*/30 * * * *";

if (!cron.validate(SCHEDULE)) {
  console.error(`Invalid cron expression: "${SCHEDULE}"`);
  process.exit(1);
}

for (const collector of COLLECTORS) repo.upsertCollector(collector);

console.log(`spinneret watch · schedule "${SCHEDULE}" · ${COLLECTORS.length} collectors`);
repo.logEvent("info", `Scheduler armed on "${SCHEDULE}"`);

let running = false;

const task = cron.schedule(SCHEDULE, async () => {
  // A sweep can outlast its own interval on a slow heal; overlapping runs would
  // corrupt the baseline, so a late tick is skipped rather than queued.
  if (running) {
    repo.logEvent("info", "Previous sweep still running — skipping this tick");
    return;
  }
  running = true;
  try {
    const outcomes = await tick();
    for (const outcome of outcomes) {
      console.log(
        `  ${outcome.slug.padEnd(18)} ${String(outcome.score).padStart(3)}/100 ` +
          `${outcome.severity}${outcome.healed ? " (repaired)" : ""}`,
      );
    }
  } finally {
    running = false;
  }
});

const shutdown = (signal: string) => {
  console.log(`\n${signal} — stopping scheduler`);
  repo.logEvent("info", "Scheduler stopped");
  task.stop();
  process.exit(0);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
