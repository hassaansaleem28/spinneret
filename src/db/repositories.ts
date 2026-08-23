import { getDb } from "./index";
import type {
  Collector,
  DriftVerdict,
  HealAttempt,
  HealStatus,
  HealthSnapshot,
  RunRecord,
  Signal,
  SourceKind,
} from "@/core/types";

/**
 * Repository layer: the only place that knows SQL.
 *
 * Callers above this line deal in domain types, so the storage engine could be
 * swapped for Postgres by rewriting this file alone.
 */

const parse = <T>(json: string, fallback: T): T => {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
};

/* ------------------------------------------------------------------ collectors */

export function upsertCollector(collector: Collector): void {
  getDb()
    .prepare(
      `INSERT INTO collectors (slug, collector_id, url, kind, label, expected_fields, created_at)
       VALUES (@slug, @collectorId, @url, @kind, @label, @expectedFields, @createdAt)
       ON CONFLICT(slug) DO UPDATE SET
         collector_id = excluded.collector_id,
         url = excluded.url,
         kind = excluded.kind,
         label = excluded.label,
         expected_fields = excluded.expected_fields`,
    )
    .run({
      slug: collector.slug,
      collectorId: collector.collectorId,
      url: collector.url,
      kind: collector.kind,
      label: collector.label,
      expectedFields: JSON.stringify(collector.expectedFields),
      createdAt: new Date().toISOString(),
    });
}

interface CollectorRow {
  slug: string;
  collector_id: string;
  url: string;
  kind: string;
  label: string;
  expected_fields: string;
}

const toCollector = (row: CollectorRow): Collector => ({
  slug: row.slug,
  collectorId: row.collector_id,
  url: row.url,
  kind: row.kind as SourceKind,
  label: row.label,
  expectedFields: parse<string[]>(row.expected_fields, []),
});

export function listCollectors(): Collector[] {
  return getDb()
    .prepare(`SELECT * FROM collectors ORDER BY slug`)
    .all()
    .map((row) => toCollector(row as CollectorRow));
}

export function getCollector(slug: string): Collector | undefined {
  const row = getDb().prepare(`SELECT * FROM collectors WHERE slug = ?`).get(slug);
  return row ? toCollector(row as CollectorRow) : undefined;
}

/* ------------------------------------------------------------------------ runs */

export function insertRun(run: Omit<RunRecord, "id">): number {
  const result = getDb()
    .prepare(
      `INSERT INTO runs (collector_slug, started_at, duration_ms, ok, row_count, error, rows)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      run.collectorSlug,
      run.startedAt,
      run.durationMs,
      run.ok ? 1 : 0,
      run.rowCount,
      run.error ?? null,
      JSON.stringify(run.rows),
    );
  return Number(result.lastInsertRowid);
}

interface RunRow {
  id: number;
  collector_slug: string;
  started_at: string;
  duration_ms: number;
  ok: number;
  row_count: number;
  error: string | null;
  rows: string;
}

const toRun = (row: RunRow): RunRecord => ({
  id: row.id,
  collectorSlug: row.collector_slug,
  startedAt: row.started_at,
  durationMs: row.duration_ms,
  ok: row.ok === 1,
  rowCount: row.row_count,
  error: row.error ?? undefined,
  rows: parse<Record<string, unknown>[]>(row.rows, []),
});

/** Most recent runs for a collector, newest first. */
export function recentRuns(slug: string, limit = 10): RunRecord[] {
  return getDb()
    .prepare(`SELECT * FROM runs WHERE collector_slug = ? ORDER BY started_at DESC LIMIT ?`)
    .all(slug, limit)
    .map((row) => toRun(row as RunRow));
}

/**
 * Runs that scored well enough to define "normal".
 *
 * Baselines are built only from these — otherwise a broken run would poison the
 * reference and the next break would look like an improvement.
 */
export function healthyRuns(slug: string, minScore = 80, limit = 8): RunRecord[] {
  return getDb()
    .prepare(
      `SELECT r.* FROM runs r
       JOIN health_snapshots h ON h.run_id = r.id
       WHERE r.collector_slug = ? AND h.score >= ? AND r.ok = 1
       ORDER BY r.started_at DESC LIMIT ?`,
    )
    .all(slug, minScore, limit)
    .map((row) => toRun(row as RunRow));
}

/* ------------------------------------------------------------- health snapshots */

export function insertHealth(snapshot: HealthSnapshot, verdict: DriftVerdict): void {
  getDb()
    .prepare(
      `INSERT INTO health_snapshots
         (run_id, collector_slug, captured_at, coverage, schema_conformance,
          yield_ratio, score, fields, severity, evidence)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      snapshot.runId,
      snapshot.collectorSlug,
      snapshot.capturedAt,
      snapshot.coverage,
      snapshot.schemaConformance,
      snapshot.yieldRatio,
      snapshot.score,
      JSON.stringify(snapshot.fields),
      verdict.severity,
      JSON.stringify(verdict.evidence),
    );
}

export interface HealthRow extends HealthSnapshot {
  severity: string;
  evidence: string[];
}

export function latestHealth(slug: string): HealthRow | undefined {
  const row = getDb()
    .prepare(
      `SELECT * FROM health_snapshots WHERE collector_slug = ? ORDER BY captured_at DESC LIMIT 1`,
    )
    .get(slug) as Record<string, unknown> | undefined;
  return row ? toHealthRow(row) : undefined;
}

/** Score history oldest-first, for sparklines. */
export function healthHistory(slug: string, limit = 30): HealthRow[] {
  const rows = getDb()
    .prepare(
      `SELECT * FROM health_snapshots WHERE collector_slug = ? ORDER BY captured_at DESC LIMIT ?`,
    )
    .all(slug, limit) as Record<string, unknown>[];
  return rows.map(toHealthRow).reverse();
}

function toHealthRow(row: Record<string, unknown>): HealthRow {
  return {
    collectorSlug: row.collector_slug as string,
    runId: row.run_id as number,
    capturedAt: row.captured_at as string,
    coverage: row.coverage as number,
    schemaConformance: row.schema_conformance as number,
    yieldRatio: row.yield_ratio as number,
    score: row.score as number,
    // Persisted before runOk existed as a column; severity is the reliable
    // record of whether the run completed.
    runOk: (row.severity as string) !== "unreachable",
    fields: parse(row.fields as string, []),
    severity: row.severity as string,
    evidence: parse(row.evidence as string, []),
  };
}

/* ---------------------------------------------------------------- heal attempts */

export function insertHeal(
  attempt: Omit<HealAttempt, "id" | "scoreAfter"> & { scoreAfter?: number },
): number {
  const result = getDb()
    .prepare(
      `INSERT INTO heal_attempts
         (collector_slug, created_at, prompt, status, score_before, score_after, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      attempt.collectorSlug,
      attempt.createdAt,
      attempt.prompt,
      attempt.status,
      attempt.scoreBefore,
      attempt.scoreAfter ?? null,
      attempt.notes ?? null,
    );
  return Number(result.lastInsertRowid);
}

export function updateHeal(
  id: number,
  patch: { status?: HealStatus; scoreAfter?: number; notes?: string },
): void {
  const current = getDb().prepare(`SELECT * FROM heal_attempts WHERE id = ?`).get(id) as
    | Record<string, unknown>
    | undefined;
  if (!current) return;

  getDb()
    .prepare(`UPDATE heal_attempts SET status = ?, score_after = ?, notes = ? WHERE id = ?`)
    .run(
      patch.status ?? (current.status as string),
      patch.scoreAfter ?? (current.score_after as number | null),
      patch.notes ?? (current.notes as string | null),
      id,
    );
}

export function listHeals(limit = 25): HealAttempt[] {
  return (
    getDb().prepare(`SELECT * FROM heal_attempts ORDER BY created_at DESC LIMIT ?`).all(limit) as
      Record<string, unknown>[]
  ).map((row) => ({
    id: row.id as number,
    collectorSlug: row.collector_slug as string,
    createdAt: row.created_at as string,
    prompt: row.prompt as string,
    status: row.status as HealStatus,
    scoreBefore: row.score_before as number,
    scoreAfter: (row.score_after as number | null) ?? undefined,
    notes: (row.notes as string | null) ?? undefined,
  }));
}

/* --------------------------------------------------------------------- signals */

/** Insert ignoring duplicates — the unique index defines what "already seen" means. */
export function insertSignals(signals: Omit<Signal, "id">[]): number {
  const statement = getDb().prepare(
    `INSERT OR IGNORE INTO signals
       (collector_slug, detected_at, company, fingerprint, kind, headline, intent, rationale, source_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const insertMany = getDb().transaction((batch: Omit<Signal, "id">[]) => {
    let inserted = 0;
    for (const signal of batch) {
      const result = statement.run(
        signal.collectorSlug,
        signal.detectedAt,
        signal.company,
        signal.fingerprint,
        signal.kind,
        signal.headline,
        signal.intent,
        JSON.stringify(signal.rationale),
        signal.sourceUrl ?? null,
      );
      inserted += result.changes;
    }
    return inserted;
  });
  return insertMany(signals);
}

export function listSignals(limit = 60): Signal[] {
  return (
    getDb()
      .prepare(`SELECT * FROM signals ORDER BY intent DESC, detected_at DESC LIMIT ?`)
      .all(limit) as Record<string, unknown>[]
  ).map((row) => ({
    id: row.id as number,
    collectorSlug: row.collector_slug as string,
    detectedAt: row.detected_at as string,
    company: row.company as string,
    fingerprint: (row.fingerprint as string) ?? "",
    kind: row.kind as SourceKind,
    headline: row.headline as string,
    intent: row.intent as number,
    rationale: parse<string[]>(row.rationale as string, []),
    sourceUrl: (row.source_url as string | null) ?? undefined,
  }));
}

/** Company names seen on the previous run — the reference for "newly appeared". */
export function companiesSeenBefore(slug: string): Set<string> {
  const rows = getDb()
    .prepare(`SELECT DISTINCT company FROM signals WHERE collector_slug = ?`)
    .all(slug) as { company: string }[];
  return new Set(rows.map((row) => row.company));
}

/* ---------------------------------------------------------------------- events */

export type EventLevel = "info" | "warn" | "heal" | "ok";

export function logEvent(level: EventLevel, message: string, collectorSlug?: string): void {
  getDb()
    .prepare(`INSERT INTO events (at, level, collector_slug, message) VALUES (?, ?, ?, ?)`)
    .run(new Date().toISOString(), level, collectorSlug ?? null, message);
}

export interface EventRecord {
  id: number;
  at: string;
  level: EventLevel;
  collectorSlug?: string;
  message: string;
}

export function listEvents(limit = 80): EventRecord[] {
  return (
    getDb().prepare(`SELECT * FROM events ORDER BY id DESC LIMIT ?`).all(limit) as
      Record<string, unknown>[]
  ).map((row) => ({
    id: row.id as number,
    at: row.at as string,
    level: row.level as EventLevel,
    collectorSlug: (row.collector_slug as string | null) ?? undefined,
    message: row.message as string,
  }));
}
