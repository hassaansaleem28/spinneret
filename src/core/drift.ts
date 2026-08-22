import type {
  Baseline,
  DriftSeverity,
  DriftVerdict,
  FieldRegression,
  HealthSnapshot,
} from "./types";

/**
 * Thresholds governing when Spinneret decides a scraper is drifting.
 *
 * These are deliberately conservative. A false positive costs a heal cycle and
 * an approval gate; a false negative costs silently hollow data for days, which
 * is the failure this whole system exists to prevent.
 */
export const THRESHOLDS = {
  /** Percentage-point fill-rate drop against baseline that counts as a regression. */
  regressionDropPct: 25,
  /** Composite score below this is treated as a hard break. */
  criticalScore: 55,
  /** Composite score below this is treated as degradation. */
  degradedScore: 80,
  /** Baseline runs required before fill-rate comparisons are trusted. */
  minBaselineSamples: 2,
} as const;

const pct = (n: number): string => `${Math.round(n * 100)}%`;

/**
 * Compare a run's vitals against its baseline and decide what happened.
 *
 * The `evidence` array is the important output: it is written to be read both
 * by a human in the fleet view and by Bright Data's healing AI as a prompt, so
 * every line cites concrete numbers rather than adjectives.
 */
export function detectDrift(
  snapshot: HealthSnapshot,
  baseline?: Baseline,
): DriftVerdict {
  const evidence: string[] = [];
  const regressedFields: FieldRegression[] = [];

  const missingFields = snapshot.fields
    .filter((field) => field.absent)
    .map((field) => field.field);

  // Schema-level breaks: the field is not merely empty, it is gone.
  if (missingFields.length > 0) {
    evidence.push(
      `Fields never returned as keys in the output: ${missingFields.join(", ")}.`,
    );
  }

  // Selector-level breaks: the key survives but the values hollowed out.
  const baselineIsTrustworthy =
    baseline !== undefined && baseline.sampleSize >= THRESHOLDS.minBaselineSamples;

  if (baselineIsTrustworthy) {
    for (const field of snapshot.fields) {
      if (field.absent) continue;
      const baselineRate = baseline.fieldFillRates[field.field] ?? 0;
      const dropPct = (baselineRate - field.fillRate) * 100;

      if (dropPct >= THRESHOLDS.regressionDropPct) {
        regressedFields.push({
          field: field.field,
          baselineFillRate: baselineRate,
          currentFillRate: field.fillRate,
          dropPct,
        });
        evidence.push(
          `Field "${field.field}" fill rate fell from ${pct(baselineRate)} ` +
            `to ${pct(field.fillRate)} (${Math.round(dropPct)} point drop).`,
        );
      }
    }

    // Row-count collapse usually means pagination or the row selector broke,
    // which is a different repair than a per-field selector fix. Saying so
    // explicitly steers the healing AI toward the right part of the code.
    if (snapshot.yieldRatio < 0.5) {
      evidence.push(
        `Row count is ${pct(snapshot.yieldRatio)} of the ${baseline.medianRowCount}-row ` +
          `baseline, which suggests the row or pagination selector broke rather than ` +
          `an individual field.`,
      );
    } else if (missingFields.length === 0 && regressedFields.length > 0) {
      evidence.push(
        `Row count is normal at ${pct(snapshot.yieldRatio)} of baseline, so pagination ` +
          `and the row selector are intact, so the breakage is field-level.`,
      );
    }
  }

  const severity = classify(snapshot, missingFields.length, regressedFields.length);

  if (severity !== "healthy" && evidence.length === 0) {
    evidence.push(
      `Composite health score is ${snapshot.score}/100 with ${pct(snapshot.coverage)} ` +
        `field coverage across the contracted schema.`,
    );
  }

  return {
    severity,
    evidence,
    regressedFields,
    missingFields,
    // A heal is only dispatched on evidence. "Degraded with no identified cause"
    // is left for a human, because an unfocused heal prompt tends to make the
    // scraper worse rather than better.
    shouldHeal:
      severity === "schema_gap" ||
      severity === "critical" ||
      (severity === "degraded" && regressedFields.length > 0),
  };
}

function classify(
  snapshot: HealthSnapshot,
  missingCount: number,
  regressionCount: number,
): DriftSeverity {
  if (missingCount > 0) return "schema_gap";
  if (snapshot.score < THRESHOLDS.criticalScore) return "critical";
  if (snapshot.score < THRESHOLDS.degradedScore || regressionCount > 0) {
    return "degraded";
  }
  return "healthy";
}
