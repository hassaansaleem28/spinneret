"use client";

import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { relativeTime } from "@/lib/format";
import type { Signal } from "@/core/types";

/**
 * Lead workspace for a single company.
 *
 * The board ranks; this explains. A rep about to open a conversation needs the
 * full change history and the reasoning behind the score in one place, because
 * the pitch is built out of exactly those facts.
 */

function intentColour(intent: number): string {
  if (intent >= 70) return "var(--vital-good)";
  if (intent >= 45) return "var(--vital-warn)";
  return "var(--ink-muted)";
}

interface Props {
  company?: string;
  signals: Signal[];
  onClose: () => void;
}

export function CompanyDrawer({ company, signals, onClose }: Props) {
  const forCompany = company
    ? signals.filter((signal) => signal.company === company)
    : [];
  const peak = forCompany.length > 0
    ? Math.max(...forCompany.map((signal) => signal.intent))
    : 0;

  // Rules can fire across several signals; showing each reason once keeps the
  // case readable without hiding that it was reinforced.
  const reasons = new Map<string, number>();
  for (const signal of forCompany) {
    for (const reason of signal.rationale) {
      reasons.set(reason, (reasons.get(reason) ?? 0) + 1);
    }
  }

  return (
    <Sheet open={Boolean(company)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full gap-0 border-line bg-surface p-0 sm:max-w-xl"
      >
        <SheetHeader className="gap-0 border-b border-line px-6 py-5">
          <p className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-silk">
            Lead Workspace
          </p>
          <div className="mt-2 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <SheetTitle className="truncate font-display text-[28px] leading-none tracking-tight text-ink">
                {company}
              </SheetTitle>
              <SheetDescription className="mt-2 font-mono text-[11px] text-ink-faint">
                {forCompany.length} signal{forCompany.length === 1 ? "" : "s"} observed
              </SheetDescription>
            </div>
            <div className="shrink-0 text-right">
              <div
                className="tabular font-mono text-[32px] font-semibold leading-none"
                style={{ color: intentColour(peak) }}
              >
                {peak}
              </div>
              <p className="mt-1.5 font-mono text-[9.5px] uppercase tracking-[0.16em] text-ink-faint">
                Peak Intent
              </p>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-7 px-6 py-6">
            <section>
              <h3 className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-ink-faint">
                Why This Company Scores
              </h3>
              <ul className="mt-3 space-y-2">
                {[...reasons.entries()]
                  .sort((a, b) => b[1] - a[1])
                  .map(([reason, count]) => (
                    <li
                      key={reason}
                      className="flex items-start gap-3 rounded-lg border border-line bg-surface-2 px-3.5 py-3"
                    >
                      <span className="mt-[7px] size-1 shrink-0 rounded-full bg-silk" aria-hidden="true" />
                      <span className="flex-1 text-[13.5px] leading-relaxed text-ink-muted">
                        {reason}
                      </span>
                      {count > 1 && (
                        <Badge
                          variant="outline"
                          className="shrink-0 border-line-bright font-mono text-[10px] text-ink-faint"
                        >
                          ×{count}
                        </Badge>
                      )}
                    </li>
                  ))}
              </ul>
            </section>

            <Separator />

            <section>
              <h3 className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-ink-faint">
                Change History
              </h3>
              <ol className="mt-3 space-y-4">
                {forCompany.map((signal) => (
                  <li key={signal.id} className="relative border-l border-line pl-5">
                    <span
                      className="absolute -left-[3.5px] top-2 size-1.5 rounded-full"
                      style={{ background: intentColour(signal.intent) }}
                      aria-hidden="true"
                    />
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-[13.5px] leading-relaxed text-ink">
                        {signal.headline}
                      </p>
                      <span
                        className="tabular font-mono text-[12.5px]"
                        style={{ color: intentColour(signal.intent) }}
                      >
                        {signal.intent}
                      </span>
                    </div>
                    <p className="mt-1.5 font-mono text-[11px] text-ink-faint">
                      {signal.kind} · {relativeTime(signal.detectedAt)} · via{" "}
                      {signal.collectorSlug}
                    </p>
                    {signal.sourceUrl && (
                      <a
                        href={signal.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1.5 break-all font-mono text-[11px] text-silk underline underline-offset-4 hover:text-ink"
                      >
                        {signal.sourceUrl}
                        <ExternalLink className="size-3 shrink-0" aria-hidden="true" />
                      </a>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          </div>
        </ScrollArea>

        <footer className="border-t border-line px-6 py-4">
          <p className="font-mono text-[11px] leading-relaxed text-ink-faint">
            Company-level signals only. Derived from public job postings and directory
            listings. No personal data is collected or scored.
          </p>
        </footer>
      </SheetContent>
    </Sheet>
  );
}
