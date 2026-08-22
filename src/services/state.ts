import { COLLECTORS } from "@/config/collectors";
import type { Collector, HealAttempt, Signal } from "@/core/types";
import * as repo from "@/db/repositories";

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
}

export interface FleetState {
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

export function buildFleetState(): FleetState {
  const registered = repo.listCollectors();
  const collectors = registered.length > 0 ? registered : COLLECTORS;

  const members: FleetMember[] = collectors.map((collector) => {
    const health = repo.latestHealth(collector.slug);
    const history = repo.healthHistory(collector.slug, 24).map((row) => row.score);
    const [lastRun] = repo.recentRuns(collector.slug, 1);

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
    };
  });

  const observed = members.filter((member) => member.severity !== "unknown");
  const fleetHealth =
    observed.length === 0
      ? 0
      : Math.round(observed.reduce((sum, m) => sum + m.score, 0) / observed.length);

  const heals = repo.listHeals(20);

  return {
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
