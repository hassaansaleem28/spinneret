import { describe, expect, it } from "vitest";
import {
  composeHealPrompt,
  composeSchemaExtensionPrompt,
  fitToBudget,
  HEAL_PROMPT_MAX_CHARS,
} from "@/core/heal-prompt";
import type { Collector, DriftVerdict, HealthSnapshot } from "@/core/types";

const collector: Collector = {
  slug: "jobs",
  collectorId: "c_test",
  url: "https://example.com/jobs",
  kind: "hiring",
  label: "Job board",
  expectedFields: ["company_name", "job_title", "location"],
};

const snapshot: HealthSnapshot = {
  collectorSlug: "jobs",
  runId: 1,
  capturedAt: "2026-08-22T10:00:00.000Z",
  coverage: 0.33,
  schemaConformance: 0.66,
  yieldRatio: 1,
  score: 45,
  fields: [
    { field: "company_name", fillRate: 1, absent: false },
    { field: "job_title", fillRate: 0.02, absent: false },
    { field: "location", fillRate: 0, absent: true },
  ],
};

const verdict: DriftVerdict = {
  severity: "schema_gap",
  evidence: ['Field "job_title" fill rate fell from 97% to 2% (95 point drop).'],
  regressedFields: [
    { field: "job_title", baselineFillRate: 0.97, currentFillRate: 0.02, dropPct: 95 },
  ],
  missingFields: ["location"],
  shouldHeal: true,
};

describe("composeHealPrompt", () => {
  const prompt = composeHealPrompt(collector, snapshot, verdict);

  it("stays inside the CLI's prompt limit", () => {
    expect(prompt.length).toBeLessThanOrEqual(HEAL_PROMPT_MAX_CHARS);
  });

  it("carries the measured evidence rather than a vague complaint", () => {
    expect(prompt).toContain("97%");
    expect(prompt).toContain("2%");
  });

  it("names the broken fields as repair targets", () => {
    expect(prompt).toContain("location");
    expect(prompt).toContain("job_title");
  });

  it("fences off the fields that still work so a heal cannot regress them", () => {
    expect(prompt).toMatch(/Do not change extraction for these fields[\s\S]*company_name/);
  });

  it("restates the full contracted schema", () => {
    for (const field of collector.expectedFields) expect(prompt).toContain(field);
  });
});

describe("fitToBudget", () => {
  it("keeps the opening and closing sections when trimming", () => {
    const sections = ["OPEN", "a".repeat(400), "b".repeat(400), "c".repeat(400), "CLOSE"];
    const result = fitToBudget(sections, 200);

    expect(result.startsWith("OPEN")).toBe(true);
    expect(result.length).toBeLessThanOrEqual(200);
  });

  it("returns an empty string for no sections", () => {
    expect(fitToBudget([], 100)).toBe("");
  });
});

describe("composeSchemaExtensionPrompt", () => {
  it("asks only for the fields that are missing", () => {
    const prompt = composeSchemaExtensionPrompt(collector, ["company_name"]);
    expect(prompt).toContain("job_title");
    expect(prompt).toContain("location");
    expect(prompt).toMatch(/Keep the existing fields working/);
  });
});
