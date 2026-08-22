"use client";

import { useEffect } from "react";
import { relativeTime } from "@/lib/format";
import type { Signal } from "@/core/types";

/**
 * Lead workspace for one company.
 *
 * The board ranks; this explains. A rep about to open a conversation needs the
 * full change history and the reasoning behind the score in one place, because
 * the pitch is built out of exactly those facts.
 */

interface Props {
  company?: string;
  signals: Signal[];
  onClose: () => void;
}

function intentColour(intent: number): string {
  if (intent >= 70) return "#34d399";
  if (intent >= 45) return "#fbbf24";
  return "#8b93a7";
}

export function CompanyDrawer({ company, signals, onClose }: Props) {
  // Escape closes the panel — expected of anything that behaves like a dialog.
  useEffect(() => {
    if (!company) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [company, onClose]);

  if (!company) return null;

  const forCompany = signals.filter((signal) => signal.company === company);
  const peak = Math.max(...forCompany.map((signal) => signal.intent), 0);

  // Rules can fire across several signals; showing each reason once keeps the
  // case readable without hiding that it was reinforced.
  const reasons = new Map<string, number>();
  for (const signal of forCompany) {
    for (const reason of signal.rationale) {
      reasons.set(reason, (reasons.get(reason) ?? 0) + 1);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        aria-label="Close lead workspace"
        onClick={onClose}
        className="absolute inset-0 bg-void/80 backdrop-blur-sm"
      />

      <aside className="fade-rise relative flex h-full w-full max-w-xl flex-col border-l border-line bg-surface shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-silk">
              lead workspace
            </p>
            <h2 className="mt-1.5 truncate text-xl font-semibold text-ink">{company}</h2>
            <p className="mt-1 font-mono text-[11px] text-ink-faint">
              {forCompany.length} signal{forCompany.length === 1 ? "" : "s"} observed
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div
                className="font-mono text-3xl font-semibold"
                style={{ color: intentColour(peak) }}
              >
                {peak}
              </div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">
                peak intent
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-md border border-line-bright px-2 py-1 font-mono text-[11px] text-ink-muted hover:border-silk/50 hover:text-ink"
            >
              esc
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 space-y-7 overflow-y-auto px-6 py-6">
          <section>
            <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">
              why this company scores
            </h3>
            <ul className="mt-3 space-y-2">
              {[...reasons.entries()]
                .sort((a, b) => b[1] - a[1])
                .map(([reason, count]) => (
                  <li
                    key={reason}
                    className="flex items-start gap-2.5 rounded-lg border border-line bg-surface-2 px-3 py-2.5"
                  >
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-silk" />
                    <span className="flex-1 text-[13px] leading-relaxed text-ink-muted">
                      {reason}
                    </span>
                    {count > 1 && (
                      <span className="shrink-0 rounded border border-line-bright px-1.5 py-0.5 font-mono text-[10px] text-ink-faint">
                        ×{count}
                      </span>
                    )}
                  </li>
                ))}
            </ul>
          </section>

          <section>
            <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">
              change history
            </h3>
            <ol className="mt-3 space-y-3">
              {forCompany.map((signal) => (
                <li key={signal.id} className="relative border-l border-line pl-5">
                  <span
                    className="absolute -left-[3.5px] top-1.5 h-1.5 w-1.5 rounded-full"
                    style={{ background: intentColour(signal.intent) }}
                  />
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-[13.5px] text-ink">{signal.headline}</p>
                    <span
                      className="font-mono text-[12px]"
                      style={{ color: intentColour(signal.intent) }}
                    >
                      {signal.intent}
                    </span>
                  </div>
                  <p className="mt-1 font-mono text-[11px] text-ink-faint">
                    {signal.kind} · {relativeTime(signal.detectedAt)} · via {signal.collectorSlug}
                  </p>
                  {signal.sourceUrl && (
                    <a
                      href={signal.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1.5 inline-block break-all font-mono text-[11px] text-silk underline underline-offset-4 hover:text-ink"
                    >
                      {signal.sourceUrl} ↗
                    </a>
                  )}
                </li>
              ))}
            </ol>
          </section>
        </div>

        <footer className="border-t border-line px-6 py-4">
          <p className="font-mono text-[11px] leading-relaxed text-ink-faint">
            Company-level signals only. Derived from public job postings and directory
            listings — no personal data is collected or scored.
          </p>
        </footer>
      </aside>
    </div>
  );
}
