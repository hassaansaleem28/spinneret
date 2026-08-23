"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Plus, RotateCcw, X } from "lucide-react";
import { detectDrift } from "@/core/drift";
import { computeHealth } from "@/core/health";
import { composeHealPrompt } from "@/core/heal-prompt";
import type { Collector } from "@/core/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { pct, severityLabel, TONE_COLOR, vitalTone } from "@/lib/format";
import type { FleetMember } from "@/services/state";

/**
 * Contract Lab.
 *
 * Everything else in this dashboard is retrospective: it reports what already
 * happened and asks to be believed. This is the one place a reader can act.
 *
 * Change what a collector is required to return and the whole diagnosis re-runs
 * against rows that collector genuinely produced, through the same pure functions
 * the sentinel uses in production. Nothing here is simulated. The contract is the
 * real definition of correct, so demanding a field the scraper does not return
 * makes it genuinely non-compliant, and the repair prompt that appears is the
 * exact text Spinneret would dispatch to Bright Data.
 *
 * It runs entirely in the browser because the scoring layer has no I/O, which is
 * also why it still works on the hosted snapshot.
 */

/** Metadata Bright Data attaches to every row; never part of a contract. */
const RESERVED_KEYS = new Set(["input"]);

interface Analysis {
  snapshot: ReturnType<typeof computeHealth>;
  verdict: ReturnType<typeof detectDrift>;
  prompt: string | undefined;
}

export function ContractLab({ members }: { members: FleetMember[] }) {
  const usable = members.filter((member) => member.sampleRows.length > 0);
  const [slug, setSlug] = useState(usable[0]?.collector.slug ?? "");
  // Seeded from the first collector's real contract. Initialising empty and
  // filling it on the slug-change path never fires, because the tracked slug
  // already matches on the first render, which left the lab starting blank.
  const [contract, setContract] = useState<string[]>(
    () => usable[0]?.collector.expectedFields ?? [],
  );
  const [draft, setDraft] = useState("");
  const reduceMotion = useReducedMotion();

  const member = usable.find((m) => m.collector.slug === slug) ?? usable[0];

  // Adjust state during render rather than in an effect: switching collector must
  // not paint one frame of the previous contract against the new collector's rows.
  const [tracked, setTracked] = useState(member?.collector.slug);
  if (member && tracked !== member.collector.slug) {
    setTracked(member.collector.slug);
    setContract(member.collector.expectedFields);
  }

  /**
   * Re-scored on every render rather than memoized. It is three pure functions
   * over at most a couple of dozen rows, so caching it costs more in complexity
   * than it saves in work, and the React Compiler cannot preserve a manual memo
   * in a component that adjusts state during render anyway.
   */
  const analysis = ((): Analysis | undefined => {
    if (!member || contract.length === 0) return undefined;

    const collector: Collector = { ...member.collector, expectedFields: contract };
    const snapshot = computeHealth(
      {
        id: 0,
        collectorSlug: collector.slug,
        startedAt: new Date().toISOString(),
        durationMs: 0,
        ok: true,
        rowCount: member.sampleRows.length,
        rows: member.sampleRows,
      },
      contract,
    );
    const verdict = detectDrift(snapshot);

    return {
      snapshot,
      verdict,
      prompt: verdict.severity === "healthy"
        ? undefined
        : composeHealPrompt(collector, snapshot, verdict),
    };
  })();

  const typed = useTypewriter(analysis?.prompt, reduceMotion ?? false);

  if (!member) return null;

  /** Keys the collector actually returns, offered as one-click additions. */
  const available = [...new Set(member.sampleRows.flatMap((row) => Object.keys(row)))]
    .filter((key) => !RESERVED_KEYS.has(key) && !contract.includes(key))
    .sort();

  const isDefault =
    contract.length === member.collector.expectedFields.length &&
    contract.every((field) => member.collector.expectedFields.includes(field));

  const addField = (field: string) => {
    const clean = field.trim();
    if (clean && !contract.includes(clean)) setContract([...contract, clean]);
    setDraft("");
  };

  const tone = vitalTone(analysis?.snapshot.score ?? 0);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      {/* ------------------------------------------------------ the contract */}
      <Card className="gap-0 border-line bg-surface/70 p-5">
        <div className="flex flex-wrap gap-2">
          {usable.map((item) => (
            <Button
              key={item.collector.slug}
              variant={item.collector.slug === member.collector.slug ? "default" : "outline"}
              size="sm"
              onClick={() => setSlug(item.collector.slug)}
              className="font-mono text-[11px]"
            >
              {item.collector.label}
            </Button>
          ))}
        </div>

        <p className="mt-4 text-[13.5px] leading-[1.7] text-ink-muted">
          Scored against {member.sampleRows.length} rows this collector genuinely
          returned. Demand a field it does not produce and watch the diagnosis
          change.
        </p>

        <div className="mt-5">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-ink-faint">
              Required Fields
            </h3>
            {!isDefault && (
              <button
                onClick={() => setContract(member.collector.expectedFields)}
                className="flex items-center gap-1.5 font-mono text-[10.5px] text-silk hover:text-ink"
              >
                <RotateCcw className="size-3" aria-hidden="true" />
                Reset
              </button>
            )}
          </div>

          <ul className="mt-2.5 flex flex-wrap gap-1.5">
            <AnimatePresence mode="popLayout">
              {contract.map((field) => {
                const stat = analysis?.snapshot.fields.find((f) => f.field === field);
                const broken = stat?.absent || (stat?.fillRate ?? 1) < 0.5;

                return (
                  <motion.li
                    key={field}
                    layout
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    transition={{ duration: 0.18 }}
                  >
                    <span
                      className={`flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[11.5px] ${
                        broken
                          ? "border-vital-bad/45 bg-vital-bad/10 text-vital-bad"
                          : "border-line-bright bg-surface-2 text-ink-muted"
                      }`}
                    >
                      {field}
                      <button
                        onClick={() => setContract(contract.filter((f) => f !== field))}
                        aria-label={`Remove ${field} from the contract`}
                        className="opacity-60 hover:opacity-100"
                      >
                        <X className="size-3" aria-hidden="true" />
                      </button>
                    </span>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              addField(draft);
            }}
            className="mt-3 flex gap-2"
          >
            <label htmlFor="contract-field" className="sr-only">
              Add a required field
            </label>
            <input
              id="contract-field"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="salary…"
              autoComplete="off"
              spellCheck={false}
              className="min-w-0 flex-1 rounded-md border border-line-bright bg-surface-2 px-2.5 py-1.5 font-mono text-[12px] text-ink placeholder:text-ink-faint focus-visible:outline-none"
            />
            <Button type="submit" size="sm" disabled={!draft.trim()} className="gap-1.5">
              <Plus className="size-3.5" aria-hidden="true" />
              Require
            </Button>
          </form>

          {available.length > 0 && (
            <div className="mt-3">
              <p className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-ink-faint">
                Also returned by this collector
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {available.map((field) => (
                  <button
                    key={field}
                    onClick={() => addField(field)}
                    className="rounded-md border border-dashed border-line-bright px-2 py-0.5 font-mono text-[11px] text-ink-faint transition-colors hover:border-silk/50 hover:text-ink"
                  >
                    + {field}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* ------------------------------------------------------ the diagnosis */}
      <Card className="gap-0 border-line bg-surface/70 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-ink-faint">
              Live Diagnosis
            </h3>
            <Badge
              variant="outline"
              className="mt-2 border-transparent px-0 font-mono text-[10px] uppercase tracking-[0.16em]"
              style={{ color: TONE_COLOR[tone] }}
            >
              {analysis ? severityLabel(analysis.verdict.severity) : "no contract"}
            </Badge>
          </div>
          <motion.div
            key={analysis?.snapshot.score ?? -1}
            initial={{ opacity: 0, scale: 0.88 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="tabular font-mono text-[44px] font-semibold leading-none"
            style={{ color: TONE_COLOR[tone] }}
          >
            {analysis?.snapshot.score ?? 0}
          </motion.div>
        </div>

        {analysis && (
          <>
            <ul className="mt-4 space-y-2 border-t border-line pt-4">
              {analysis.snapshot.fields.map((field) => (
                <li key={field.field} className="flex items-center gap-3">
                  <span className="w-[104px] shrink-0 truncate font-mono text-[11px] text-ink-muted">
                    {field.field}
                  </span>
                  <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-line">
                    <motion.span
                      className="block h-full rounded-full"
                      animate={{ width: `${field.fillRate * 100}%` }}
                      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                      style={{
                        background: field.absent ? TONE_COLOR.bad : TONE_COLOR.good,
                      }}
                    />
                  </span>
                  <span
                    className="tabular w-[52px] shrink-0 text-right font-mono text-[11px]"
                    style={{
                      color: field.absent ? TONE_COLOR.bad : "var(--ink-muted)",
                    }}
                  >
                    {field.absent ? "absent" : pct(field.fillRate)}
                  </span>
                </li>
              ))}
            </ul>

            {analysis.verdict.evidence.length > 0 && (
              <div className="mt-4 rounded-lg border border-vital-bad/25 bg-vital-bad/[0.06] p-3">
                <p className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-vital-bad">
                  Evidence Gathered
                </p>
                <ul className="mt-1.5 space-y-1">
                  {analysis.verdict.evidence.map((line) => (
                    <li key={line} className="text-[12.5px] leading-relaxed text-ink-muted">
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-4 min-h-[132px] rounded-lg border border-line bg-void/60 p-3.5">
              <p className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-silk">
                {analysis.prompt
                  ? `Repair Prompt · ${analysis.prompt.length} chars`
                  : "Repair Prompt"}
              </p>
              {analysis.prompt ? (
                <p className="mt-2 font-mono text-[11.5px] leading-[1.75] text-ink-muted">
                  {typed}
                  {typed.length < analysis.prompt.length && (
                    <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-silk align-middle" />
                  )}
                </p>
              ) : (
                <p className="mt-2 text-[12.5px] leading-relaxed text-ink-faint">
                  Contract met, so there is nothing to repair. Remove a field the
                  collector returns, or require one it does not, and Spinneret will
                  write the instruction it would send to Bright Data.
                </p>
              )}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

/**
 * Reveal text a character at a time.
 *
 * The prompt being assembled from measurements is the idea this whole project
 * rests on, and watching it appear makes that legible in a way a finished block
 * of text does not. Anyone who has asked for less motion gets it immediately.
 */
function useTypewriter(target: string | undefined, skip: boolean): string {
  const [revealed, setRevealed] = useState(0);
  const [tracked, setTracked] = useState(target);

  // Adjusting state during render is React's documented way to reset when an
  // input changes. Doing it in an effect instead would paint the previous
  // prompt for a frame before clearing it, and would fire an extra render.
  if (tracked !== target) {
    setTracked(target);
    setRevealed(0);
  }

  useEffect(() => {
    if (!target || skip) return;

    const timer = setInterval(() => {
      setRevealed((count) => {
        if (count >= target.length) {
          clearInterval(timer);
          return count;
        }
        return count + 3;
      });
    }, 12);

    return () => clearInterval(timer);
  }, [target, skip]);

  if (!target) return "";
  return skip ? target : target.slice(0, revealed);
}
