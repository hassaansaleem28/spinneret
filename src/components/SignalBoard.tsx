"use client";

import { Fragment, useState } from "react";
import { relativeTime } from "@/lib/format";
import type { Signal } from "@/core/types";

/**
 * Ranked buying signals.
 *
 * Intent is expanded into its reasons on click rather than shown as a bare
 * number, because a sales team will not act on a score they cannot argue with.
 * Every point in the total traces back to a stated rule.
 */

function intentColour(intent: number): string {
  if (intent >= 70) return "#34d399";
  if (intent >= 45) return "#fbbf24";
  return "#8b93a7";
}

interface Props {
  signals: Signal[];
  onOpenCompany: (company: string) => void;
}

export function SignalBoard({ signals, onOpenCompany }: Props) {
  const [expanded, setExpanded] = useState<number>();

  if (signals.length === 0) {
    return (
      <div className="rounded-xl border border-line bg-surface/80 p-6">
        <p className="font-mono text-[12px] text-ink-faint">
          No signals yet — run an observation to populate the board.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface/80">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-line">
            {["intent", "company", "signal", "source", "seen"].map((heading) => (
              <th
                key={heading}
                className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-widest text-ink-faint"
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {signals.map((signal) => {
            const open = expanded === signal.id;
            return (
              <Fragment key={signal.id}>
                <tr
                  onClick={() => setExpanded(open ? undefined : signal.id)}
                  className="cursor-pointer border-b border-line/60 transition-colors hover:bg-surface-2"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="font-mono text-sm font-semibold"
                        style={{ color: intentColour(signal.intent) }}
                      >
                        {signal.intent}
                      </span>
                      <span className="h-1 w-10 overflow-hidden rounded-full bg-line">
                        <span
                          className="block h-full rounded-full"
                          style={{
                            width: `${signal.intent}%`,
                            background: intentColour(signal.intent),
                          }}
                        />
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        onOpenCompany(signal.company);
                      }}
                      className="text-left text-sm font-medium text-ink underline decoration-transparent underline-offset-4 transition-colors hover:decoration-silk"
                    >
                      {signal.company}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm text-ink-muted">{signal.headline}</td>
                  <td className="px-4 py-3">
                    <span className="rounded border border-line-bright px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-ink-faint">
                      {signal.kind}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-ink-faint">
                    {relativeTime(signal.detectedAt)}
                  </td>
                </tr>

                {open && (
                  <tr className="border-b border-line/60 bg-void/50">
                    <td colSpan={5} className="px-4 py-4">
                      <p className="font-mono text-[10px] uppercase tracking-widest text-silk">
                        why this scored {signal.intent}
                      </p>
                      <ul className="mt-2 space-y-1.5">
                        {signal.rationale.map((reason) => (
                          <li
                            key={reason}
                            className="flex gap-2 text-[12.5px] leading-relaxed text-ink-muted"
                          >
                            <span className="text-silk">·</span>
                            {reason}
                          </li>
                        ))}
                      </ul>
                      {signal.sourceUrl && (
                        <a
                          href={signal.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-3 inline-block font-mono text-[11px] text-silk underline underline-offset-4 hover:text-ink"
                        >
                          open source ↗
                        </a>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
