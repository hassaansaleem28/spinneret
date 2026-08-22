import { COLLECTORS } from "@/config/collectors";
import type { Collector } from "@/core/types";
import * as repo from "@/db/repositories";
import { isInCooldown } from "@/core/cooldown";
import { approveAndVerify, heal, observe } from "./sentinel";

/**
 * Unattended fleet supervision.
 *
 * A single verified heal proves the loop closes. A schedule proves the system is
 * *maintenance*, which is the actual claim: scrapers decay continuously, so the
 * thing that repairs them has to run continuously too.
 */

/** Space collector runs apart so a tick does not burst against rate limits. */
export const STAGGER_MS = 20_000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Most recent heal attempt for a collector, or undefined if it has never healed. */
function lastHealFor(slug: string) {
  return repo.listHeals(50).find((attempt) => attempt.collectorSlug === slug);
}

export interface TickOutcome {
  slug: string;
  score: number;
  severity: string;
  healed: boolean;
  skippedReason?: string;
}

/** One supervision pass over a single collector. */
export async function superviseOne(collector: Collector): Promise<TickOutcome> {
  const { snapshot, verdict } = await observe(collector);

  const base = { slug: collector.slug, score: snapshot.score, severity: verdict.severity };

  if (!verdict.shouldHeal) {
    return { ...base, healed: false };
  }

  if (isInCooldown(lastHealFor(collector.slug))) {
    repo.logEvent(
      "info",
      "Drift detected, but a recent heal is still within cooldown, so leaving it for review",
      collector.slug,
    );
    return { ...base, healed: false, skippedReason: "cooldown" };
  }

  const attempt = await heal(collector);
  if (!attempt.dispatched) {
    return { ...base, healed: false, skippedReason: "dispatch failed" };
  }

  const { improved } = await approveAndVerify(collector, attempt.healId);
  return { ...base, healed: improved };
}

/** One supervision pass over the whole fleet, staggered. */
export async function tick(collectors: Collector[] = COLLECTORS): Promise<TickOutcome[]> {
  repo.logEvent("info", `Scheduled sweep starting across ${collectors.length} collectors`);
  const outcomes: TickOutcome[] = [];

  for (const [index, collector] of collectors.entries()) {
    if (index > 0) await sleep(STAGGER_MS);
    try {
      outcomes.push(await superviseOne(collector));
    } catch (error) {
      repo.logEvent(
        "warn",
        `Sweep failed: ${error instanceof Error ? error.message : String(error)}`,
        collector.slug,
      );
      outcomes.push({
        slug: collector.slug,
        score: 0,
        severity: "unknown",
        healed: false,
        skippedReason: "error",
      });
    }
  }

  const repaired = outcomes.filter((outcome) => outcome.healed).length;
  repo.logEvent(
    "ok",
    `Sweep complete. ${outcomes.length} observed, ${repaired} repaired`,
  );
  return outcomes;
}
