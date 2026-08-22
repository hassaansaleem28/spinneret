"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { relativeTime } from "@/lib/format";
import type { HealAttempt } from "@/core/types";

/**
 * The heal ledger — what turns "self-healing" from a claim into a measurement.
 *
 * Each entry pairs the machine-authored prompt with the health score before and
 * after, so a reader can check whether the repair actually worked instead of
 * taking the word "healed" on trust.
 */

const STATUS_TONE: Record<string, string> = {
  verified: "border-vital-good/40 bg-vital-good/10 text-vital-good",
  approved: "border-silk/40 bg-silk/10 text-silk",
  awaiting_approval: "border-vital-warn/40 bg-vital-warn/10 text-vital-warn",
  proposed: "border-line-bright bg-surface-2 text-ink-muted",
  failed: "border-vital-bad/40 bg-vital-bad/10 text-vital-bad",
  rejected: "border-vital-bad/40 bg-vital-bad/10 text-vital-bad",
};

interface Props {
  heals: HealAttempt[];
  onApprove: (slug: string, healId: number) => void;
  busySlug?: string;
}

export function HealLedger({ heals, onApprove, busySlug }: Props) {
  if (heals.length === 0) {
    return (
      <Card className="border-line bg-surface/70 p-8 text-center">
        <p className="text-[14px] text-ink-muted">No heals dispatched yet.</p>
        <p className="mt-1.5 font-mono text-[12px] text-ink-faint">
          The sentinel raises one only when the telemetry justifies it.
        </p>
      </Card>
    );
  }

  return (
    <ol className="space-y-3">
      {heals.map((heal, index) => {
        const delta =
          heal.scoreAfter !== undefined ? heal.scoreAfter - heal.scoreBefore : undefined;

        return (
          <motion.li
            key={heal.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
          >
            <Card className="gap-0 border-line bg-surface/70 p-5">
              <header className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="tabular font-mono text-[11px] text-ink-faint">
                    #{heal.id}
                  </span>
                  <span className="text-[14.5px] font-semibold text-ink">
                    {heal.collectorSlug}
                  </span>
                  <Badge
                    variant="outline"
                    className={`font-mono text-[9.5px] uppercase tracking-[0.14em] ${
                      STATUS_TONE[heal.status] ?? STATUS_TONE.proposed
                    }`}
                  >
                    {heal.status.replace(/_/g, " ")}
                  </Badge>
                </div>

                <div className="flex items-center gap-3.5 font-mono text-[12.5px]">
                  <span className="text-ink-faint">{relativeTime(heal.createdAt)}</span>
                  <span className="tabular flex items-center gap-1.5 text-ink-muted">
                    {heal.scoreBefore}
                    <ArrowRight className="size-3 text-ink-faint" aria-hidden="true" />
                    {heal.scoreAfter ?? "…"}
                  </span>
                  {delta !== undefined && (
                    <span
                      className={`tabular font-semibold ${
                        delta > 0 ? "text-vital-good" : "text-vital-bad"
                      }`}
                    >
                      {delta > 0 ? `+${delta}` : delta}
                    </span>
                  )}
                </div>
              </header>

              <div className="mt-3.5 rounded-lg border border-line bg-void/60 p-3.5">
                <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-silk">
                  Machine-Authored Prompt · {heal.prompt.length} chars
                </p>
                <p className="mt-2 font-mono text-[12px] leading-[1.7] text-ink-muted">
                  {heal.prompt}
                </p>
              </div>

              {heal.notes && (
                <p className="mt-2.5 font-mono text-[11px] text-ink-faint">{heal.notes}</p>
              )}

              {heal.status === "awaiting_approval" && (
                <Button
                  size="sm"
                  disabled={busySlug === heal.collectorSlug}
                  onClick={() => onApprove(heal.collectorSlug, heal.id)}
                  className="mt-3.5 w-fit font-mono text-[11px]"
                >
                  {busySlug === heal.collectorSlug ? "Verifying…" : "Approve & Verify"}
                </Button>
              )}
            </Card>
          </motion.li>
        );
      })}
    </ol>
  );
}
