import type {
  Baseline,
  FieldStat,
  HealthSnapshot,
  RunRecord,
} from "./types";

/** Weights for the composite health score. Must sum to 1. */
const WEIGHTS = {
  coverage: 0.5,
  schemaConformance: 0.3,
  yieldRatio: 0.2,
} as const;

/**
 * A value "counts" only if it carries information. Scrapers that break rarely
 * throw — they quietly emit `null`, `""`, or the literal string "null", and the
 * pipeline keeps running on hollow rows. Treating those as missing is the whole
 * basis of drift detection.
 */
export function isFilled(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") {
    const trimmed = value.trim().toLowerCase();
    return trimmed !== "" && trimmed !== "null" && trimmed !== "n/a" && trimmed !== "undefined";
  }
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value as object).length > 0;
  return true;
}

/**
 * Per-field occupancy across a run's rows.
 *
 * `absent` distinguishes the two failure modes that need different repairs:
 * a field present-but-empty means the selector drifted, whereas a field that
 * never appears as a key means the schema itself regressed.
 */
export function computeFieldStats(
  rows: Record<string, unknown>[],
  expectedFields: string[],
): FieldStat[] {
  const observedKeys = new Set(rows.flatMap((row) => Object.keys(row)));

  return expectedFields.map((field) => {
    if (!observedKeys.has(field)) {
      return { field, fillRate: 0, absent: true };
    }
    if (rows.length === 0) {
      return { field, fillRate: 0, absent: false };
    }
    const filled = rows.reduce(
      (count, row) => count + (isFilled(row[field]) ? 1 : 0),
      0,
    );
    return { field, fillRate: filled / rows.length, absent: false };
  });
}

/** Median without mutating the caller's array. */
function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/**
 * Build a rolling reference from prior *healthy* runs.
 *
 * Median rather than mean: one catastrophic run (a timeout returning two rows)
 * would drag a mean baseline down far enough to mask the next real break.
 */
export function computeBaseline(
  collectorSlug: string,
  healthyRuns: RunRecord[],
  expectedFields: string[],
): Baseline {
  const rowCounts = healthyRuns.map((run) => run.rowCount);
  const fieldFillRates: Record<string, number> = {};

  for (const field of expectedFields) {
    const rates = healthyRuns.map((run) => {
      const [stat] = computeFieldStats(run.rows, [field]);
      return stat.fillRate;
    });
    fieldFillRates[field] = median(rates);
  }

  return {
    collectorSlug,
    sampleSize: healthyRuns.length,
    medianRowCount: median(rowCounts),
    fieldFillRates,
  };
}

/** Clamp helper — keeps ratios inside 0..1 so the score stays interpretable. */
const clamp01 = (n: number): number => Math.min(1, Math.max(0, n));

/**
 * Turn one run into vitals.
 *
 * With no baseline yet (the collector's first run) `yieldRatio` is treated as
 * nominal, so a brand-new collector is not flagged as broken merely for lacking
 * history.
 */
export function computeHealth(
  run: RunRecord,
  expectedFields: string[],
  baseline?: Baseline,
): HealthSnapshot {
  const fields = computeFieldStats(run.rows, expectedFields);

  const coverage =
    fields.length === 0
      ? 0
      : fields.reduce((sum, f) => sum + f.fillRate, 0) / fields.length;

  const schemaConformance =
    fields.length === 0
      ? 0
      : fields.filter((f) => !f.absent).length / fields.length;

  const yieldRatio =
    baseline && baseline.medianRowCount > 0
      ? clamp01(run.rowCount / baseline.medianRowCount)
      : run.rowCount > 0
        ? 1
        : 0;

  const score = run.ok
    ? Math.round(
        (coverage * WEIGHTS.coverage +
          schemaConformance * WEIGHTS.schemaConformance +
          yieldRatio * WEIGHTS.yieldRatio) *
          100,
      )
    : 0;

  return {
    collectorSlug: run.collectorSlug,
    runId: run.id,
    capturedAt: run.startedAt,
    coverage,
    schemaConformance,
    yieldRatio,
    score,
    fields,
  };
}
