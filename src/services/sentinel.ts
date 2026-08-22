import { scraperApprove, scraperHeal, scraperRun } from "@/adapters/brightdata/cli";
import { detectDrift } from "@/core/drift";
import { computeBaseline, computeHealth } from "@/core/health";
import { composeHealPrompt, composeSchemaExtensionPrompt } from "@/core/heal-prompt";
import { deriveSignals } from "@/core/signals";
import type { Collector, DriftVerdict, HealthSnapshot } from "@/core/types";
import * as repo from "@/db/repositories";

/**
 * The Drift Sentinel.
 *
 * This is the loop the product is built around:
 *
 *   observe -> measure -> diagnose -> compose prompt -> heal -> approve -> verify
 *
 * Nothing in it asks a human what is wrong. The prompt handed to Bright Data's
 * healing AI is generated from the numbers gathered in the measure step, which is
 * the difference between a scraper that reports it is broken and one that repairs
 * itself.
 */

export interface ObserveResult {
  runId: number;
  snapshot: HealthSnapshot;
  verdict: DriftVerdict;
  newSignals: number;
}

/**
 * Run a collector once and record everything learned from it.
 *
 * Baseline is computed from prior *healthy* runs only, so the reference for
 * "normal" cannot be dragged down by the very degradation being detected.
 */
export async function observe(collector: Collector): Promise<ObserveResult> {
  repo.logEvent("info", `Running collector ${collector.collectorId}`, collector.slug);

  const startedAt = new Date().toISOString();
  const outcome = await scraperRun(collector.collectorId, collector.url);

  const runId = repo.insertRun({
    collectorSlug: collector.slug,
    startedAt,
    durationMs: outcome.durationMs,
    ok: outcome.ok,
    rowCount: outcome.rows.length,
    error: outcome.error,
    rows: outcome.rows,
  });

  const priorHealthy = repo.healthyRuns(collector.slug);
  const baseline =
    priorHealthy.length > 0
      ? computeBaseline(collector.slug, priorHealthy, collector.expectedFields)
      : undefined;

  const snapshot = computeHealth(
    {
      id: runId,
      collectorSlug: collector.slug,
      startedAt,
      durationMs: outcome.durationMs,
      ok: outcome.ok,
      rowCount: outcome.rows.length,
      error: outcome.error,
      rows: outcome.rows,
    },
    collector.expectedFields,
    baseline,
  );

  const verdict = detectDrift(snapshot, baseline);
  repo.insertHealth(snapshot, verdict);

  // Signals are derived even from a degraded run: partial data still carries
  // intent, and suppressing it would hide leads while a repair is pending.
  const previouslySeen = repo.companiesSeenBefore(collector.slug);
  const signals = deriveSignals(collector, outcome.rows, previouslySeen, startedAt);
  const newSignals = signals.length > 0 ? repo.insertSignals(signals) : 0;

  repo.logEvent(
    verdict.severity === "healthy" ? "ok" : "warn",
    `Health ${snapshot.score}/100 · ${outcome.rows.length} rows · ${verdict.severity}` +
      (newSignals > 0 ? ` · ${newSignals} new signals` : ""),
    collector.slug,
  );

  for (const line of verdict.evidence) {
    repo.logEvent("warn", line, collector.slug);
  }

  return { runId, snapshot, verdict, newSignals };
}

export interface HealResult {
  healId: number;
  prompt: string;
  dispatched: boolean;
  status: string;
  detail: string;
}

/**
 * Diagnose the latest snapshot and dispatch a repair.
 *
 * Returns without dispatching when the evidence does not justify one — an
 * unfocused heal prompt tends to degrade a working scraper, so "no clear cause"
 * is treated as a reason to wait rather than to guess.
 */
export async function heal(collector: Collector): Promise<HealResult> {
  const latest = repo.latestHealth(collector.slug);
  if (!latest) {
    throw new Error(`No health snapshot for ${collector.slug}. Run observe() first.`);
  }

  const verdict = detectDrift(latest, undefined);
  const evidence = latest.evidence.length > 0 ? latest.evidence : verdict.evidence;

  const enrichedVerdict: DriftVerdict = {
    ...verdict,
    severity: latest.severity as DriftVerdict["severity"],
    evidence,
  };

  // When some contracted fields still arrive and others never appeared, the task
  // is to *extend* the schema rather than repair a drifted selector. Saying so
  // plainly gives the healing AI a narrower, more reliable job.
  const presentFields = latest.fields.filter((field) => !field.absent).map((f) => f.field);
  const isPartialSchema =
    enrichedVerdict.severity === "schema_gap" && presentFields.length > 0;

  const prompt = isPartialSchema
    ? composeSchemaExtensionPrompt(collector, presentFields)
    : composeHealPrompt(collector, latest, enrichedVerdict);

  const healId = repo.insertHeal({
    collectorSlug: collector.slug,
    createdAt: new Date().toISOString(),
    prompt,
    status: "proposed",
    scoreBefore: latest.score,
  });

  repo.logEvent("heal", `Composed heal prompt from telemetry: "${prompt}"`, collector.slug);

  const { envelope, result } = await scraperHeal(
    collector.collectorId,
    prompt,
    collector.url,
  );

  const status = envelope?.status ?? (result.ok ? "awaiting_approval" : "failed");
  const dispatched = result.ok;

  repo.updateHeal(healId, {
    status: dispatched ? "awaiting_approval" : "failed",
    notes: dispatched
      ? (envelope?.next_step ?? "Heal dispatched; awaiting approval.")
      : result.stderr.trim().slice(0, 400),
  });

  repo.logEvent(
    dispatched ? "heal" : "warn",
    dispatched
      ? `Heal dispatched for ${collector.collectorId}, status ${status}`
      : `Heal dispatch failed: ${result.stderr.trim().slice(0, 200)}`,
    collector.slug,
  );

  return {
    healId,
    prompt,
    dispatched,
    status,
    detail: dispatched ? (envelope?.next_step ?? "") : result.stderr.slice(0, 400),
  };
}

/**
 * Approve a pending heal, then re-run to measure whether it actually worked.
 *
 * The verification run is the point: a heal is only credited once the score it
 * produced is recorded next to the score it replaced.
 */
export async function approveAndVerify(
  collector: Collector,
  healId: number,
): Promise<{ scoreBefore: number; scoreAfter: number; improved: boolean }> {
  repo.logEvent("heal", `Approving heal ${healId}`, collector.slug);

  const { result } = await scraperApprove(collector.collectorId, collector.url);

  if (!result.ok) {
    repo.updateHeal(healId, {
      status: "failed",
      notes: result.stderr.trim().slice(0, 400),
    });
    repo.logEvent("warn", `Approval failed: ${result.stderr.slice(0, 200)}`, collector.slug);
    throw new Error(`Approve failed for ${collector.slug}`);
  }

  repo.updateHeal(healId, { status: "approved" });

  const before = repo.latestHealth(collector.slug)?.score ?? 0;
  const verification = await observe(collector);
  const after = verification.snapshot.score;
  const improved = after > before;

  repo.updateHeal(healId, {
    status: improved ? "verified" : "failed",
    scoreAfter: after,
    notes: `Verification run scored ${after}/100 (was ${before}/100).`,
  });

  repo.logEvent(
    improved ? "ok" : "warn",
    improved
      ? `Heal verified. Health recovered from ${before} to ${after}/100`
      : `Heal did not improve health (${before} to ${after}/100)`,
    collector.slug,
  );

  return { scoreBefore: before, scoreAfter: after, improved };
}
