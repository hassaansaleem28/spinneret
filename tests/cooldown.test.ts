import { describe, expect, it } from "vitest";
import { HEAL_COOLDOWN_MS, isInCooldown } from "@/core/cooldown";
import type { HealAttempt, HealStatus } from "@/core/types";

const NOW = new Date("2026-08-22T12:00:00.000Z").getTime();

const attempt = (status: HealStatus, minutesAgo: number): HealAttempt => ({
  id: 1,
  collectorSlug: "jobs",
  createdAt: new Date(NOW - minutesAgo * 60_000).toISOString(),
  prompt: "…",
  status,
  scoreBefore: 20,
});

describe("isInCooldown", () => {
  it("permits a heal when the collector has never healed", () => {
    expect(isInCooldown(undefined, NOW)).toBe(false);
  });

  it("blocks a second heal while one is still awaiting approval", () => {
    expect(isInCooldown(attempt("awaiting_approval", 5), NOW)).toBe(true);
  });

  it("blocks retrying a failed heal on a timer", () => {
    // Re-sending a prompt already shown not to work burns credits and can make
    // the scraper worse; a visibly broken collector is the better failure mode.
    expect(isInCooldown(attempt("failed", 5), NOW)).toBe(true);
  });

  it("permits a heal once the cooldown has elapsed", () => {
    const justPast = HEAL_COOLDOWN_MS / 60_000 + 1;
    expect(isInCooldown(attempt("failed", justPast), NOW)).toBe(false);
  });

  it("permits repairing a collector that drifted again after a verified heal", () => {
    expect(isInCooldown(attempt("verified", 1), NOW)).toBe(false);
  });

  it("permits a fresh attempt immediately after a rejection", () => {
    // A rejected fix means a human wants a different prompt, not a pause.
    expect(isInCooldown(attempt("rejected", 1), NOW)).toBe(false);
  });
});
