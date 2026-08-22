"use client";

import { Fragment, useMemo, useState } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { relativeTime } from "@/lib/format";
import type { Signal } from "@/core/types";

/**
 * Ranked buying signals.
 *
 * Intent expands into its reasons on click rather than sitting there as a bare
 * number, because a sales team will not act on a score it cannot argue with.
 * Every point in the total traces back to a stated rule.
 */

function intentColour(intent: number): string {
  if (intent >= 70) return "var(--vital-good)";
  if (intent >= 45) return "var(--vital-warn)";
  return "var(--ink-muted)";
}

interface Props {
  signals: Signal[];
  onOpenCompany: (company: string) => void;
}

/**
 * Rows shown before the list is collapsed.
 *
 * The board is for triage, not archaeology: a rep works the top of a ranked list
 * and rarely scrolls past a dozen. Capping also keeps the DOM small enough that
 * no virtualization is needed.
 */
const COLLAPSED_ROWS = 12;

export function SignalBoard({ signals, onOpenCompany }: Props) {
  const [expanded, setExpanded] = useState<number>();
  const [showAll, setShowAll] = useState(false);

  const visible = useMemo(
    () => (showAll ? signals : signals.slice(0, COLLAPSED_ROWS)),
    [signals, showAll],
  );
  const hidden = signals.length - visible.length;

  if (signals.length === 0) {
    return (
      <Card className="border-line bg-surface/70 p-8 text-center">
        <p className="text-[14px] text-ink-muted">No signals match this view yet.</p>
        <p className="mt-1.5 font-mono text-[12px] text-ink-faint">
          Run an observation to populate the board.
        </p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-line bg-surface/70 p-0">
      <Table>
        <TableHeader>
          <TableRow className="border-line hover:bg-transparent">
            {["Intent", "Company", "Signal", "Source", "Seen"].map((heading) => (
              <TableHead
                key={heading}
                className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-ink-faint"
              >
                {heading}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>

        <TableBody>
          {visible.map((signal) => {
            const open = expanded === signal.id;
            const colour = intentColour(signal.intent);

            return (
              <Fragment key={signal.id}>
                <TableRow
                  onClick={() => setExpanded(open ? undefined : signal.id)}
                  className="cursor-pointer border-line/60 transition-colors hover:bg-surface-2"
                >
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <span
                        className="tabular font-mono text-[13.5px] font-semibold"
                        style={{ color: colour }}
                      >
                        {signal.intent}
                      </span>
                      <span
                        className="h-1 w-11 overflow-hidden rounded-full bg-line"
                        aria-hidden="true"
                      >
                        <span
                          className="block h-full rounded-full"
                          style={{ width: `${signal.intent}%`, background: colour }}
                        />
                      </span>
                    </div>
                  </TableCell>

                  <TableCell>
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        onOpenCompany(signal.company);
                      }}
                      className="text-left text-[14px] font-medium text-ink underline decoration-transparent underline-offset-4 transition-colors hover:decoration-silk"
                    >
                      {signal.company}
                    </button>
                  </TableCell>

                  <TableCell className="max-w-[520px]">
                    <span className="line-clamp-1 text-[13.5px] text-ink-muted">
                      {signal.headline}
                    </span>
                  </TableCell>

                  <TableCell>
                    <Badge
                      variant="outline"
                      className="border-line-bright font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-faint"
                    >
                      {signal.kind}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] text-ink-faint">
                        {relativeTime(signal.detectedAt)}
                      </span>
                      <ChevronDown
                        className={`size-3.5 text-ink-faint transition-transform ${
                          open ? "rotate-180" : ""
                        }`}
                        aria-hidden="true"
                      />
                    </div>
                  </TableCell>
                </TableRow>

                {open && (
                  <TableRow className="border-line/60 bg-void/60 hover:bg-void/60">
                    <TableCell colSpan={5} className="px-4 py-4">
                      <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-silk">
                        Why This Scored {signal.intent}
                      </p>
                      <ul className="mt-2.5 space-y-1.5">
                        {signal.rationale.map((reason) => (
                          <li
                            key={reason}
                            className="flex gap-2.5 text-[13px] leading-relaxed text-ink-muted"
                          >
                            <span className="text-silk" aria-hidden="true">
                              ·
                            </span>
                            {reason}
                          </li>
                        ))}
                      </ul>
                      {signal.sourceUrl && (
                        <a
                          href={signal.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-3 inline-flex items-center gap-1.5 font-mono text-[11px] text-silk underline underline-offset-4 hover:text-ink"
                        >
                          Open Source
                          <ExternalLink className="size-3" aria-hidden="true" />
                        </a>
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>

      {(hidden > 0 || showAll) && (
        <div className="border-t border-line px-4 py-3 text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAll(!showAll)}
            className="font-mono text-[11px] text-ink-muted hover:text-ink"
          >
            {showAll
              ? `Show Top ${COLLAPSED_ROWS}`
              : `Show ${hidden} More ${hidden === 1 ? "Signal" : "Signals"}`}
          </Button>
        </div>
      )}
    </Card>
  );
}
