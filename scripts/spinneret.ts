/**
 * Spinneret control CLI.
 *
 * The hackathon brief asks for the whole workflow to be drivable from a terminal
 * inside a coding agent, so every capability the dashboard exposes is reachable
 * here too. The dashboard and this CLI call the same service layer — neither is a
 * reimplementation of the other.
 *
 *   npm run spinneret -- seed
 *   npm run spinneret -- observe <slug>
 *   npm run spinneret -- heal <slug>
 *   npm run spinneret -- approve <slug> <healId>
 *   npm run spinneret -- cycle <slug>
 *   npm run spinneret -- status
 */
import { COLLECTORS, findCollector } from "@/config/collectors";
import { approveAndVerify, heal, observe } from "@/services/sentinel";
import * as repo from "@/db/repositories";

const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const CYAN = "\x1b[36m";
const RESET = "\x1b[0m";

function seed(): void {
  for (const collector of COLLECTORS) {
    repo.upsertCollector(collector);
    console.log(`${GREEN}registered${RESET} ${collector.slug} -> ${collector.collectorId}`);
  }
}

function requireCollector(slug: string | undefined) {
  if (!slug) throw new Error("A collector slug is required.");
  const collector = findCollector(slug);
  if (!collector) {
    throw new Error(
      `Unknown collector "${slug}". Known: ${COLLECTORS.map((c) => c.slug).join(", ")}`,
    );
  }
  return collector;
}

const pct = (n: number) => `${Math.round(n * 100)}%`;

function severityColor(severity: string): string {
  if (severity === "healthy") return GREEN;
  if (severity === "degraded") return YELLOW;
  return RED;
}

async function cmdObserve(slug: string): Promise<void> {
  const collector = requireCollector(slug);
  repo.upsertCollector(collector);

  console.log(`${CYAN}▸ observing${RESET} ${collector.label} (${collector.collectorId})`);
  console.log(`${DIM}  this runs the real collector and may take 30-90s${RESET}`);

  const { snapshot, verdict, newSignals } = await observe(collector);

  console.log(`\n${BOLD}health ${snapshot.score}/100${RESET}  ` +
    `coverage ${pct(snapshot.coverage)} · schema ${pct(snapshot.schemaConformance)} · ` +
    `yield ${pct(snapshot.yieldRatio)}`);
  console.log(`${severityColor(verdict.severity)}severity: ${verdict.severity}${RESET}`);

  for (const field of snapshot.fields) {
    const marker = field.absent ? `${RED}absent${RESET}` : `${pct(field.fillRate)} filled`;
    console.log(`  ${field.field.padEnd(16)} ${marker}`);
  }

  if (verdict.evidence.length > 0) {
    console.log(`\n${BOLD}evidence${RESET}`);
    for (const line of verdict.evidence) console.log(`  · ${line}`);
  }
  console.log(`\n${newSignals} new signals recorded.`);
  if (verdict.shouldHeal) {
    console.log(`${YELLOW}▸ drift warrants a heal — run: npm run spinneret -- heal ${slug}${RESET}`);
  }
}

async function cmdHeal(slug: string): Promise<void> {
  const collector = requireCollector(slug);
  console.log(`${CYAN}▸ composing heal prompt from telemetry${RESET}`);

  const result = await heal(collector);

  console.log(`\n${BOLD}machine-authored prompt${RESET} (${result.prompt.length} chars)`);
  console.log(`${DIM}${result.prompt}${RESET}\n`);

  if (result.dispatched) {
    console.log(`${GREEN}heal dispatched${RESET} · heal id ${result.healId} · status ${result.status}`);
    console.log(`next: npm run spinneret -- approve ${slug} ${result.healId}`);
  } else {
    console.log(`${RED}dispatch failed${RESET}: ${result.detail}`);
    process.exitCode = 1;
  }
}

async function cmdApprove(slug: string, healId: string): Promise<void> {
  const collector = requireCollector(slug);
  console.log(`${CYAN}▸ approving heal ${healId} and verifying${RESET}`);

  const { scoreBefore, scoreAfter, improved } = await approveAndVerify(
    collector,
    Number(healId),
  );

  const color = improved ? GREEN : RED;
  console.log(
    `\n${color}${improved ? "verified" : "no improvement"}${RESET} · ` +
      `health ${scoreBefore} -> ${scoreAfter}/100`,
  );
}

/** Full unattended loop: observe, and heal only if the evidence justifies it. */
async function cmdCycle(slug: string): Promise<void> {
  const collector = requireCollector(slug);
  repo.upsertCollector(collector);

  const { verdict } = await observe(collector);
  if (!verdict.shouldHeal) {
    console.log(`${GREEN}healthy — no heal needed${RESET}`);
    return;
  }
  const healResult = await heal(collector);
  if (!healResult.dispatched) {
    console.log(`${RED}heal dispatch failed${RESET}`);
    process.exitCode = 1;
    return;
  }
  await cmdApprove(slug, String(healResult.healId));
}

function cmdStatus(): void {
  console.log(`${BOLD}fleet${RESET}`);
  for (const collector of repo.listCollectors()) {
    const health = repo.latestHealth(collector.slug);
    const label = health
      ? `${severityColor(health.severity)}${String(health.score).padStart(3)}/100 ${health.severity}${RESET}`
      : `${DIM}no data${RESET}`;
    console.log(`  ${collector.slug.padEnd(18)} ${collector.collectorId.padEnd(22)} ${label}`);
  }

  const heals = repo.listHeals(8);
  if (heals.length > 0) {
    console.log(`\n${BOLD}recent heals${RESET}`);
    for (const attempt of heals) {
      const delta =
        attempt.scoreAfter !== undefined
          ? `${attempt.scoreBefore} -> ${attempt.scoreAfter}`
          : `${attempt.scoreBefore} -> pending`;
      console.log(`  #${attempt.id} ${attempt.collectorSlug.padEnd(18)} ${attempt.status.padEnd(18)} ${delta}`);
    }
  }
}

async function main(): Promise<void> {
  const [command, ...args] = process.argv.slice(2);

  switch (command) {
    case "seed":    return seed();
    case "observe": return cmdObserve(args[0]);
    case "heal":    return cmdHeal(args[0]);
    case "approve": return cmdApprove(args[0], args[1]);
    case "cycle":   return cmdCycle(args[0]);
    case "status":  return cmdStatus();
    default:
      console.log("commands: seed | observe <slug> | heal <slug> | approve <slug> <id> | cycle <slug> | status");
      process.exitCode = command ? 1 : 0;
  }
}

main().catch((error: unknown) => {
  console.error(`${RED}error:${RESET}`, error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
