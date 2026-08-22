import type { HealAttempt } from "./types";

/** Refuse to re-heal a collector this soon after the previous attempt. */
export const HEAL_COOLDOWN_MS = 45 * 60 * 1000;

/**
 * Statuses that block a fresh heal.
 *
 * `failed` is included deliberately: a repair that did not raise the score must
 * not be retried on a timer. Re-sending a prompt already shown not to work burns
 * credits and can degrade the scraper further — leaving the collector visibly
 * broken for a human is the better failure mode.
 *
 * `verified` and `rejected` are absent, so a collector that genuinely drifts
 * again later can be repaired again.
 */
const BLOCKING_STATUSES = new Set(["proposed", "awaiting_approval", "approved", "failed"]);

/**
 * Decide whether a new heal is permitted, given the most recent attempt.
 *
 * Kept pure and separate from the scheduler so the unattended retry policy — the
 * part that spends money without supervision — can be tested exhaustively.
 */
export function isInCooldown(
  lastAttempt: HealAttempt | undefined,
  now: number = Date.now(),
): boolean {
  if (!lastAttempt) return false;
  if (!BLOCKING_STATUSES.has(lastAttempt.status)) return false;

  const age = now - new Date(lastAttempt.createdAt).getTime();
  return age < HEAL_COOLDOWN_MS;
}
