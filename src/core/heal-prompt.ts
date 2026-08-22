import type { Collector, DriftVerdict, HealthSnapshot } from "./types";

/**
 * `bdata scraper heal` caps its prompt argument at 1000 characters. Budgeting
 * slightly under keeps room for shell-level escaping without truncation.
 */
export const HEAL_PROMPT_MAX_CHARS = 960;

/**
 * Compose the natural-language repair instruction sent to Bright Data's healing
 * AI — from telemetry, not from a human.
 *
 * This is the hinge of the whole system. A heal is only as good as its prompt,
 * and the prompts that work cite specific fields, specific magnitudes, and an
 * explicit boundary around what must NOT change. Spinneret already measured all
 * three, so it writes a better prompt than a human would type under pressure at
 * 3am — and it can do it unattended.
 */
export function composeHealPrompt(
  collector: Collector,
  snapshot: HealthSnapshot,
  verdict: DriftVerdict,
): string {
  const sections: string[] = [];

  sections.push(
    `The scraper for ${collector.label} (${collector.url}) is returning incomplete data.`,
  );

  // Evidence first: the healing AI needs to know what changed, with magnitudes.
  for (const line of verdict.evidence) {
    sections.push(line);
  }

  // Naming the healthy fields is what stops a heal from regressing working code.
  const healthyFields = snapshot.fields
    .filter((field) => !field.absent && field.fillRate >= 0.9)
    .map((field) => field.field);

  if (healthyFields.length > 0) {
    sections.push(
      `Do not change extraction for these fields, which are still correct: ${healthyFields.join(", ")}.`,
    );
  }

  const targets = [...verdict.missingFields, ...verdict.regressedFields.map((r) => r.field)];

  sections.push(
    targets.length > 0
      ? `Re-derive selectors for ${targets.join(", ")} from the current live DOM and return the full contracted schema: ${collector.expectedFields.join(", ")}.`
      : `Re-derive the extraction logic from the current live DOM and return the full contracted schema: ${collector.expectedFields.join(", ")}.`,
  );

  return fitToBudget(sections, HEAL_PROMPT_MAX_CHARS);
}

/**
 * Assemble sections within a hard character budget.
 *
 * The first and last sections are load-bearing — the opening states the target
 * and the closing states the required schema — so when the budget binds, middle
 * evidence lines are dropped from least to most recently added rather than the
 * whole string being cut mid-sentence.
 */
export function fitToBudget(sections: string[], maxChars: number): string {
  if (sections.length === 0) return "";

  const join = (parts: string[]): string => parts.join(" ");
  const working = [...sections];

  while (join(working).length > maxChars && working.length > 2) {
    // Drop the second-to-last evidence line: keeps the opening statement and
    // the closing schema requirement, sheds the most redundant detail.
    working.splice(working.length - 2, 1);
  }

  const assembled = join(working);
  return assembled.length <= maxChars
    ? assembled
    : `${assembled.slice(0, maxChars - 1).trimEnd()}…`;
}

/**
 * Prompt used to grow a deliberately minimal collector up to its full contracted
 * schema. This is the documented Scraper Studio pattern — build two fields, then
 * extend by healing — and Spinneret drives it from the same evidence path as a
 * real break, so the demo exercises production code rather than a special case.
 */
export function composeSchemaExtensionPrompt(collector: Collector, present: string[]): string {
  const missing = collector.expectedFields.filter((field) => !present.includes(field));

  return fitToBudget(
    [
      `The scraper for ${collector.label} (${collector.url}) currently returns only: ${present.join(", ")}.`,
      `Extend it to also extract: ${missing.join(", ")}.`,
      `Keep the existing fields working exactly as they are and add the new fields to the output schema.`,
    ],
    HEAL_PROMPT_MAX_CHARS,
  );
}
