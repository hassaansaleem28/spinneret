import { describe, expect, it } from "vitest";
import { detectDrift, THRESHOLDS } from "@/core/drift";
import type { Baseline, HealthSnapshot } from "@/core/types";

const snapshot = (overrides: Partial<HealthSnapshot> = {}): HealthSnapshot => ({
  collectorSlug: "test",
  runId: 1,
  capturedAt: "2026-08-22T10:00:00.000Z",
  coverage: 1,
  schemaConformance: 1,
  yieldRatio: 1,
  score: 100,
  fields: [{ field: "price", fillRate: 1, absent: false }],
  ...overrides,
});

const baseline = (fillRates: Record<string, number>, rowCount = 50): Baseline => ({
  collectorSlug: "test",
  sampleSize: 5,
  medianRowCount: rowCount,
  fieldFillRates: fillRates,
});

describe("detectDrift", () => {
  it("reports healthy when nothing regressed", () => {
    const verdict = detectDrift(snapshot(), baseline({ price: 1 }));
    expect(verdict.severity).toBe("healthy");
    expect(verdict.shouldHeal).toBe(false);
  });

  it("classifies an absent field as a schema gap and always heals it", () => {
    const verdict = detectDrift(
      snapshot({ fields: [{ field: "price", fillRate: 0, absent: true }], score: 20 }),
    );
    expect(verdict.severity).toBe("schema_gap");
    expect(verdict.missingFields).toEqual(["price"]);
    expect(verdict.shouldHeal).toBe(true);
  });

  it("quantifies a fill-rate regression in the evidence", () => {
    const verdict = detectDrift(
      snapshot({
        fields: [{ field: "price", fillRate: 0.05, absent: false }],
        coverage: 0.05,
        score: 62,
      }),
      baseline({ price: 0.98 }),
    );

    expect(verdict.regressedFields[0]).toMatchObject({ field: "price" });
    // Evidence must carry numbers — it becomes the heal prompt verbatim.
    expect(verdict.evidence.join(" ")).toMatch(/98%/);
    expect(verdict.evidence.join(" ")).toMatch(/5%/);
    expect(verdict.shouldHeal).toBe(true);
  });

  it("distinguishes a row-selector break from a field break", () => {
    const verdict = detectDrift(
      snapshot({
        yieldRatio: 0.1,
        score: 40,
        fields: [{ field: "price", fillRate: 0.2, absent: false }],
      }),
      baseline({ price: 0.95 }),
    );
    expect(verdict.evidence.join(" ")).toMatch(/pagination/i);
  });

  it("ignores fill-rate comparisons until the baseline has enough samples", () => {
    const thin: Baseline = {
      collectorSlug: "test",
      sampleSize: THRESHOLDS.minBaselineSamples - 1,
      medianRowCount: 50,
      fieldFillRates: { price: 1 },
    };
    const verdict = detectDrift(
      snapshot({ fields: [{ field: "price", fillRate: 0, absent: false }], score: 85 }),
      thin,
    );
    // An untrustworthy baseline must not manufacture a regression.
    expect(verdict.regressedFields).toHaveLength(0);
  });

  it("withholds a heal when degraded with no identified cause", () => {
    // An unfocused prompt tends to make a scraper worse, so this waits for a human.
    const verdict = detectDrift(snapshot({ score: 70, coverage: 0.7 }), baseline({ price: 0.72 }));
    expect(verdict.severity).toBe("degraded");
    expect(verdict.shouldHeal).toBe(false);
  });
});
