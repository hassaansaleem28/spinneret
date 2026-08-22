"use client";

import { motion } from "framer-motion";
import { Activity, Wrench } from "lucide-react";
import { Sparkline } from "./Sparkline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { pct, relativeTime, severityLabel, TONE_HEX, vitalTone } from "@/lib/format";
import type { FleetMember } from "@/services/state";

/**
 * Per-collector vitals.
 *
 * Field-level bars rather than one aggregate: "83/100" tells an operator that
 * something is wrong, but the bar that dropped to zero tells them which selector
 * to look at. That same per-field detail is what the heal prompt is built from,
 * so the card shows exactly the evidence the machine reasons over.
 */

interface Props {
  member: FleetMember;
  selected: boolean;
  busy: boolean;
  onSelect: () => void;
  onObserve: () => void;
  onHeal: () => void;
}

export function VitalCard({ member, selected, busy, onSelect, onObserve, onHeal }: Props) {
  const tone = vitalTone(member.score);
  const colour = TONE_HEX[tone];
  const needsHeal = member.severity !== "healthy" && member.severity !== "unknown";

  return (
    <Card
      onClick={onSelect}
      data-selected={selected}
      className="cursor-pointer gap-0 border-line bg-surface/70 p-5 transition-colors hover:border-line-bright data-[selected=true]:border-silk/50"
    >
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-semibold text-ink">
            {member.collector.label}
          </h3>
          <p
            className="mt-1 truncate font-mono text-[11px] text-ink-faint"
            translate="no"
          >
            {member.collector.collectorId}
          </p>
        </div>

        <div className="flex shrink-0 items-end gap-3">
          <Sparkline history={member.history} />
          <div className="text-right">
            <div
              className="tabular font-mono text-[26px] font-semibold leading-none"
              style={{ color: colour }}
            >
              {member.score}
            </div>
            <Badge
              variant="outline"
              className="mt-1.5 border-transparent px-0 font-mono text-[9.5px] uppercase tracking-[0.16em]"
              style={{ color: colour }}
            >
              {severityLabel(member.severity)}
            </Badge>
          </div>
        </div>
      </header>

      <dl className="mt-4 grid grid-cols-3 gap-2 border-y border-line py-3">
        {(
          [
            ["Coverage", member.coverage, "Share of contracted fields carrying a usable value"],
            ["Schema", member.schemaConformance, "Share of contracted fields present as keys at all"],
            ["Yield", member.yieldRatio, "Row count against the rolling healthy baseline"],
          ] as const
        ).map(([label, value, explanation]) => (
          <Tooltip key={label}>
            <TooltipTrigger
              render={
                <div className="text-left">
                  <dt className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-ink-faint">
                    {label}
                  </dt>
                  <dd className="tabular mt-1 font-mono text-[13px] text-ink">
                    {pct(value)}
                  </dd>
                </div>
              }
            />
            <TooltipContent>{explanation}</TooltipContent>
          </Tooltip>
        ))}
      </dl>

      <ul className="mt-4 space-y-2.5">
        {member.fields.map((field, index) => (
          <li key={field.field} className="flex items-center gap-3">
            <span className="w-[104px] shrink-0 truncate font-mono text-[11px] text-ink-muted">
              {field.field}
            </span>
            <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-line">
              <motion.span
                className="block h-full rounded-full"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.6, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  transformOrigin: "left",
                  width: `${Math.max(field.fillRate * 100, field.absent ? 0 : 2)}%`,
                  background: field.absent ? TONE_HEX.bad : colour,
                }}
              />
            </span>
            <span
              className="tabular w-[52px] shrink-0 text-right font-mono text-[11px]"
              style={{ color: field.absent ? TONE_HEX.bad : "var(--ink-muted)" }}
            >
              {field.absent ? "absent" : pct(field.fillRate)}
            </span>
          </li>
        ))}
      </ul>

      {member.evidence.length > 0 && (
        <div className="mt-4 rounded-lg border border-vital-bad/25 bg-vital-bad/[0.06] p-3">
          <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-vital-bad">
            Sentinel Evidence
          </p>
          <ul className="mt-1.5 space-y-1">
            {member.evidence.map((line) => (
              <li key={line} className="text-[12.5px] leading-relaxed text-ink-muted">
                {line}
              </li>
            ))}
          </ul>
        </div>
      )}

      <footer className="mt-4 flex items-center justify-between gap-3">
        <span className="tabular font-mono text-[11px] text-ink-faint">
          {member.rowCount} rows · {relativeTime(member.lastSeen)}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={(event) => {
              event.stopPropagation();
              onObserve();
            }}
            className="h-7 gap-1.5 px-2.5 font-mono text-[11px]"
          >
            <Activity className="size-3" aria-hidden="true" />
            {busy ? "Running…" : "Observe"}
          </Button>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  size="sm"
                  disabled={busy || !needsHeal}
                  onClick={(event) => {
                    event.stopPropagation();
                    onHeal();
                  }}
                  className="h-7 gap-1.5 px-2.5 font-mono text-[11px]"
                >
                  <Wrench className="size-3" aria-hidden="true" />
                  Heal
                </Button>
              }
            />
            <TooltipContent>
              {needsHeal
                ? "Compose a repair prompt from this collector's telemetry"
                : "Nothing to repair — this collector is meeting its contract"}
            </TooltipContent>
          </Tooltip>
        </div>
      </footer>
    </Card>
  );
}
