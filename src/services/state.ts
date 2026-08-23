import { COLLECTORS } from "@/config/collectors";
import type { Collector, HealAttempt, Signal } from "@/core/types";
import * as repo from "@/db/repositories";
import { isReadOnly } from "@/lib/runtime";
import snapshot from "@/data/snapshot.json";

/** Rows per collector handed to the client for the Contract Lab. */
const SAMPLE_ROW_LIMIT = 24;

/**
 * Read model for the dashboard.
 *
 * Assembled here rather than in the route handlers so the SSE stream and the
 * one-shot JSON endpoint are guaranteed to serve identical shapes.
 */

export interface FleetMember {
  collector: Collector;
  score: number;
  severity: string;
  coverage: number;
  schemaConformance: number;
  yieldRatio: number;
  fields: { field: string; fillRate: number; absent: boolean }[];
  evidence: string[];
  history: number[];
  lastSeen?: string;
  rowCount: number;
  /**
   * A slice of the rows this collector actually returned on its last healthy run.
   *
   * Shipped to the client so the Contract Lab can re-score a real run against a
   * contract the reader edits, using the same pure functions the sentinel runs.
   * Capped because the whole point is to be instant, and nobody needs sixty rows
   * to see a fill rate move.
   */
  sampleRows: Record<string, unknown>[];
}

export interface FleetState {
  /** True when this build cannot run collectors or dispatch heals. */
  readOnly: boolean;
  members: FleetMember[];
  events: repo.EventRecord[];
  signals: Signal[];
  heals: HealAttempt[];
  summary: {
    fleetHealth: number;
    healthyCount: number;
    degradedCount: number;
    totalSignals: number;
    healsVerified: number;
  };
}

/**
 * Assemble the dashboard state.
 *
 * A read-only build serves the committed snapshot and never touches SQLite, so
 * the deployed bundle has no native-module dependency at request time.
 */
export function buildFleetState(): FleetState {
  if (isReadOnly()) return snapshot as FleetState;
  return liveFleetState();
}

function liveFleetState(): FleetState {
  const registered = repo.listCollectors();
  const collectors = registered.length > 0 ? registered : COLLECTORS;

  const members: FleetMember[] = collectors.map((collector) => {
    const health = repo.latestHealth(collector.slug);
    const history = repo.healthHistory(collector.slug, 24).map((row) => row.score);
    const [lastRun] = repo.recentRuns(collector.slug, 1);

    // Prefer a run that actually returned data: re-scoring an empty timeout would
    // show nothing moving whatever the reader does to the contract.
    const [lastGoodRun] = repo.healthyRuns(collector.slug, 1, 1);
    const source = lastGoodRun ?? lastRun;

    return {
      collector,
      score: health?.score ?? 0,
      severity: health?.severity ?? "unknown",
      coverage: health?.coverage ?? 0,
      schemaConformance: health?.schemaConformance ?? 0,
      yieldRatio: health?.yieldRatio ?? 0,
      fields:
        health?.fields ??
        collector.expectedFields.map((field) => ({ field, fillRate: 0, absent: true })),
      evidence: health?.evidence ?? [],
      history,
      lastSeen: health?.capturedAt,
      rowCount: lastRun?.rowCount ?? 0,
      sampleRows: (source?.rows ?? []).slice(0, SAMPLE_ROW_LIMIT),
    };
  });

  const observed = members.filter((member) => member.severity !== "unknown");
  const fleetHealth =
    observed.length === 0
      ? 0
      : Math.round(observed.reduce((sum, m) => sum + m.score, 0) / observed.length);

  const heals = repo.listHeals(20);

  return {
    readOnly: false,
    members,
    events: repo.listEvents(70),
    signals: repo.listSignals(50),
    heals,
    summary: {
      fleetHealth,
      healthyCount: members.filter((m) => m.severity === "healthy").length,
      degradedCount: members.filter(
        (m) => m.severity !== "healthy" && m.severity !== "unknown",
      ).length,
      totalSignals: repo.listSignals(1000).length,
      healsVerified: heals.filter((heal) => heal.status === "verified").length,
    },
  };
}
