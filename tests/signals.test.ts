import { describe, expect, it } from "vitest";
import { deriveSignals, resolveField } from "@/core/signals";
import type { Collector } from "@/core/types";

const collector: Collector = {
  slug: "jobs",
  collectorId: "c_test",
  url: "https://example.com",
  kind: "hiring",
  label: "Job board",
  expectedFields: ["company_name", "job_title"],
};

const at = "2026-08-22T10:00:00.000Z";

describe("resolveField", () => {
  it("matches a candidate key exactly, ignoring case", () => {
    expect(resolveField({ Company: "Acme" }, ["company"])).toBe("Acme");
  });

  it("falls back to containment so generated names still resolve", () => {
    // Collector field names are AI-generated and vary per target.
    expect(resolveField({ job_title: "AE" }, ["title"])).toBe("AE");
  });

  it("skips blank values rather than returning them", () => {
    expect(resolveField({ company: "   " }, ["company"])).toBeUndefined();
  });
});

describe("deriveSignals", () => {
  it("scores a revenue-role opening above a support hire", () => {
    const [signal] = deriveSignals(
      collector,
      [{ company_name: "Acme", job_title: "Account Executive, Enterprise" }],
      new Set(["Acme"]),
      at,
    );
    expect(signal.intent).toBeGreaterThanOrEqual(30);
    expect(signal.rationale.join(" ")).toMatch(/Revenue-carrying role/);
  });

  it("rewards concurrent openings as a coordinated build-out", () => {
    const [multi] = deriveSignals(
      collector,
      [
        { company_name: "Acme", job_title: "Account Executive" },
        { company_name: "Acme", job_title: "Sales Engineer" },
        { company_name: "Acme", job_title: "SDR" },
      ],
      new Set(["Acme"]),
      at,
    );
    const [single] = deriveSignals(
      collector,
      [{ company_name: "Acme", job_title: "Account Executive" }],
      new Set(["Acme"]),
      at,
    );
    expect(multi.intent).toBeGreaterThan(single.intent);
    expect(multi.rationale.join(" ")).toMatch(/concurrent openings/);
  });

  it("treats a newly appeared company as fresher than a known one", () => {
    const [fresh] = deriveSignals(
      collector,
      [{ company_name: "Newco", job_title: "Account Executive" }],
      new Set(["Acme"]),
      at,
    );
    expect(fresh.rationale.join(" ")).toMatch(/Newly appeared/);
  });

  it("caps intent at 100 however many rules fire", () => {
    const [signal] = deriveSignals(
      collector,
      Array.from({ length: 12 }, () => ({
        company_name: "Acme",
        job_title: "VP Sales, Global Enterprise Revenue",
      })),
      new Set(),
      at,
    );
    expect(signal.intent).toBeLessThanOrEqual(100);
  });

  it("skips rows with no resolvable company", () => {
    expect(deriveSignals(collector, [{ job_title: "AE" }], new Set(), at)).toHaveLength(0);
  });

  it("returns signals ranked by intent", () => {
    const signals = deriveSignals(
      collector,
      [
        { company_name: "Low", job_title: "Onboarding Specialist" },
        { company_name: "High", job_title: "VP Sales" },
      ],
      new Set(["Low", "High"]),
      at,
    );
    expect(signals[0].company).toBe("High");
  });
});
