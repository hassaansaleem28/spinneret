"use client";

import { relativeTime } from "@/lib/format";
import type { HealAttempt } from "@/core/types";

/**
 * The heal ledger — the audit trail that makes "self-healing" a measurable claim.
 *
 * Each entry pairs the machine-authored prompt with the health score before and
 * after, so a reader can check whether the repair actually worked instead of
 * taking the word "healed" on trust.
 */

const STATUS_TONE: Record<string, string> = {
  verified: "text-vital-good border-vital-good/40 bg-vital-good/10",
  approved: "text-silk border-silk/40 bg-silk/10",
  awaiting_approval: "text-vital-warn border-vital-warn/40 bg-vital-warn/10",
  proposed: "text-ink-muted border-line-bright bg-surface-2",
  failed: "text-vital-bad border-vital-bad/40 bg-vital-bad/10",
  rejected: "text-vital-bad border-vital-bad/40 bg-vital-bad/10",
};

interface Props {
  heals: HealAttempt[];
  onApprove: (slug: string, healId: number) => void;
  busySlug?: string;
}

export function HealLedger({ heals, onApprove, busySlug }: Props) {
  if (heals.length === 0) {
    return (
      <div className="rounded-xl border border-line bg-surface/80 p-6">
        <p className="font-mono text-[12px] text-ink-faint">
          No heals dispatched yet. The sentinel raises one only when the telemetry
          justifies it.
        </p>
      </div>
    );
  }

  return (
    <ol className="space-y-3">
      {heals.map((heal) => {
        const delta =
          heal.scoreAfter !== undefined ? heal.scoreAfter - heal.scoreBefore : undefined;

        return (
          <li
            key={heal.id}
            className="fade-rise rounded-xl border border-line bg-surface/80 p-4"
          >
            <header className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-[11px] text-ink-faint">#{heal.id}</span>
                <span className="font-medium text-ink">{heal.collectorSlug}</span>
                <span
                  className={`rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${
                    STATUS_TONE[heal.status] ?? STATUS_TONE.proposed
                  }`}
                >
                  {heal.status.replace(/_/g, " ")}
                </span>
              </div>

              <div className="flex items-center gap-3 font-mono text-[12px]">
                <span className="text-ink-faint">{relativeTime(heal.createdAt)}</span>
                <span className="text-ink-muted">
                  {heal.scoreBefore}
                  <span className="mx-1 text-ink-faint">→</span>
                  {heal.scoreAfter ?? "—"}
                </span>
                {delta !== undefined && (
                  <span className={delta > 0 ? "text-vital-good" : "text-vital-bad"}>
                    {delta > 0 ? `+${delta}` : delta}
                  </span>
                )}
              </div>
            </header>

            <div className="mt-3 rounded-lg border border-line bg-void/60 p-3">
              <p className="font-mono text-[10px] uppercase tracking-widest text-silk">
                machine-authored prompt · {heal.prompt.length} chars
              </p>
              <p className="mt-1.5 font-mono text-[11.5px] leading-relaxed text-ink-muted">
                {heal.prompt}
              </p>
            </div>

            {heal.notes && (
              <p className="mt-2 font-mono text-[11px] text-ink-faint">{heal.notes}</p>
            )}

            {heal.status === "awaiting_approval" && (
              <button
                onClick={() => onApprove(heal.collectorSlug, heal.id)}
                disabled={busySlug === heal.collectorSlug}
                className="mt-3 rounded-md border border-silk/40 bg-silk/10 px-3 py-1.5 font-mono text-[11px] text-silk transition-colors hover:bg-silk/20 disabled:opacity-40"
              >
                {busySlug === heal.collectorSlug ? "verifying…" : "approve + verify"}
              </button>
            )}
          </li>
        );
      })}
    </ol>
  );
}
