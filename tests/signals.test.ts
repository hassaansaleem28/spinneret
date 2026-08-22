import { describe, expect, it } from "vitest";
import { deriveSignals, resolveField, truncateTitle } from "@/core/signals";
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

describe("deriveSignals across source kinds", () => {
  const changelog: Collector = {
    slug: "velocity",
    collectorId: "c_test",
    url: "https://example.com/changelog",
    kind: "changelog",
    label: "Competitor changelog",
    subjectCompany: "Linear",
    expectedFields: ["release_title", "summary"],
  };

  it("attributes every row of a single-subject source to its subject company", () => {
    // Changelog rows carry no company name — the collector names it instead.
    const signals = deriveSignals(
      changelog,
      [{ release_title: "SAML SSO", summary: "Enterprise auth" }],
      new Set(),
      at,
    );
    expect(signals).toHaveLength(1);
    expect(signals[0].company).toBe("Linear");
  });

  it("reads enterprise-readiness work as moving upmarket", () => {
    const [signal] = deriveSignals(
      changelog,
      [{ release_title: "SCIM provisioning and audit logs", summary: "SOC 2 ready" }],
      new Set(["Linear"]),
      at,
    );
    expect(signal.rationale.join(" ")).toMatch(/upmarket/);
  });

  it("does not apply hiring rules to a changelog", () => {
    // "Account executive" in a release note names a feature, not a hire. With no
    // changelog rule matching either, the correct result is no signal at all —
    // Spinneret never invents intent it cannot justify.
    const signals = deriveSignals(
      changelog,
      [{ release_title: "Account executive dashboard", summary: "New view" }],
      new Set(["Linear"]),
      at,
    );
    expect(signals).toHaveLength(0);
  });

  it("scores directory listings on sector fit rather than job function", () => {
    const directory: Collector = {
      slug: "startups",
      collectorId: "c_test",
      url: "https://example.com",
      kind: "directory",
      label: "Startup directory",
      expectedFields: ["company_name", "one_liner"],
    };
    const [signal] = deriveSignals(
      directory,
      [{ company_name: "Acme", one_liner: "B2B SaaS platform for developers" }],
      new Set(["Acme"]),
      at,
    );
    expect(signal.rationale.join(" ")).toMatch(/B2B software company/);
  });

  it("matches sector language across array fields, not just strings", () => {
    const directory: Collector = {
      slug: "startups",
      collectorId: "c_test",
      url: "https://example.com",
      kind: "directory",
      label: "Startup directory",
      expectedFields: ["company_name", "tags"],
    };
    const [signal] = deriveSignals(
      directory,
      [{ company_name: "Acme", one_liner: "Car washes", tags: ["AI", "Automation"] }],
      new Set(["Acme"]),
      at,
    );
    expect(signal.rationale.join(" ")).toMatch(/AI-native/);
  });
});

describe("truncateTitle", () => {
  it("leaves a short title untouched", () => {
    expect(truncateTitle("Account Executive")).toBe("Account Executive");
  });

  it("collapses runs of whitespace", () => {
    expect(truncateTitle("Account   Executive\n\nEnterprise")).toBe(
      "Account Executive Enterprise",
    );
  });

  it("clips a long title at a word boundary", () => {
    const long = "Coding sessions on mobile Guided Reviews are now generally available Support for GitHub teams";
    const result = truncateTitle(long);

    expect(result.length).toBeLessThanOrEqual(73);
    expect(result.endsWith("…")).toBe(true);

    // The real property of a word-boundary clip: the kept text is a prefix of
    // the original, and the original continues with a space rather than the
    // rest of a chopped word.
    const body = result.slice(0, -1);
    expect(long.startsWith(body)).toBe(true);
    expect(long[body.length]).toBe(" ");
  });

  it("falls back to a hard clip when there is no usable word boundary", () => {
    const result = truncateTitle("a".repeat(200), 20);
    expect(result).toBe(`${"a".repeat(20)}…`);
  });
});
