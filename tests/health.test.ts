import { describe, expect, it } from "vitest";
import { computeBaseline, computeFieldStats, computeHealth, isFilled } from "@/core/health";
import type { RunRecord } from "@/core/types";

const run = (rows: Record<string, unknown>[], overrides: Partial<RunRecord> = {}): RunRecord => ({
  id: 1,
  collectorSlug: "test",
  startedAt: "2026-08-22T10:00:00.000Z",
  durationMs: 1000,
  ok: true,
  rowCount: rows.length,
  rows,
  ...overrides,
});

describe("isFilled", () => {
  it("rejects the placeholder values a broken scraper emits instead of throwing", () => {
    // These are the real failure mode: the pipeline keeps running on hollow rows.
    expect(isFilled(null)).toBe(false);
    expect(isFilled("")).toBe(false);
    expect(isFilled("   ")).toBe(false);
    expect(isFilled("null")).toBe(false);
    expect(isFilled("N/A")).toBe(false);
  });

  it("accepts values that carry information", () => {
    expect(isFilled("Acme")).toBe(true);
    expect(isFilled(0)).toBe(true);
    expect(isFilled(["a"])).toBe(true);
  });

  it("treats empty collections as unfilled", () => {
    expect(isFilled([])).toBe(false);
    expect(isFilled({})).toBe(false);
  });
});

describe("computeFieldStats", () => {
  it("separates an absent key from a present-but-empty one", () => {
    // The distinction drives which repair the heal prompt asks for.
    const stats = computeFieldStats([{ a: "x", b: null }], ["a", "b", "c"]);

    expect(stats.find((s) => s.field === "b")).toMatchObject({ absent: false, fillRate: 0 });
    expect(stats.find((s) => s.field === "c")).toMatchObject({ absent: true });
  });

  it("computes fill rate across rows", () => {
    const stats = computeFieldStats(
      [{ price: 10 }, { price: null }, { price: 30 }, { price: "" }],
      ["price"],
    );
    expect(stats[0].fillRate).toBe(0.5);
  });
});

describe("computeBaseline", () => {
  it("uses the median so one catastrophic run cannot poison the reference", () => {
    const runs = [
      run([{ a: "1" }, { a: "2" }, { a: "3" }]),
      run([{ a: "1" }, { a: "2" }, { a: "3" }]),
      run([{ a: "1" }]), // an outlier that a mean would let drag the baseline down
    ];
    expect(computeBaseline("test", runs, ["a"]).medianRowCount).toBe(3);
  });
});

describe("computeHealth", () => {
  it("scores a complete run near perfect", () => {
    const snapshot = computeHealth(
      run([{ a: "x", b: "y" }, { a: "x", b: "y" }]),
      ["a", "b"],
    );
    expect(snapshot.score).toBe(100);
    expect(snapshot.schemaConformance).toBe(1);
  });

  it("collapses the score when contracted fields never appear", () => {
    // Reproduces the real gap found on the job-board collector: rows returned,
    // but none of the contracted fields present.
    const snapshot = computeHealth(run([{ url: "x" }, { url: "y" }]), ["company", "title"]);

    expect(snapshot.coverage).toBe(0);
    expect(snapshot.schemaConformance).toBe(0);
    expect(snapshot.score).toBe(20); // yield alone still counts
  });

  it("does not penalise a first run for having no history", () => {
    const snapshot = computeHealth(run([{ a: "x" }]), ["a"]);
    expect(snapshot.yieldRatio).toBe(1);
  });

  it("scores a failed run at zero regardless of prior rows", () => {
    const snapshot = computeHealth(run([], { ok: false, error: "timeout" }), ["a"]);
    expect(snapshot.score).toBe(0);
  });
});

describe("computeHealth carries the run outcome", () => {
  it("marks a completed run as reachable", () => {
    expect(computeHealth(run([{ a: "x" }]), ["a"]).runOk).toBe(true);
  });

  it("marks a failed run as unreachable so drift detection can tell them apart", () => {
    const snapshot = computeHealth(run([], { ok: false, error: "timeout" }), ["a"]);
    expect(snapshot.runOk).toBe(false);
    expect(snapshot.score).toBe(0);
  });
});
