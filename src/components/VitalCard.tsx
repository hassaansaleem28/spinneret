"use client";

import { pct, relativeTime, severityLabel, TONE_HEX, vitalTone } from "@/lib/format";
import type { FleetMember } from "@/services/state";

/**
 * Per-collector vitals.
 *
 * Field-level bars rather than one aggregate score: "83/100" tells an operator
 * something is wrong, but the bar that dropped to zero tells them which selector
 * to look at. That per-field detail is also exactly what the heal prompt is built
 * from, so the card shows the same evidence the machine reasons over.
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
    <article
      onClick={onSelect}
      className={`fade-rise cursor-pointer rounded-xl border bg-surface/80 p-5 transition-colors ${
        selected ? "border-silk/60" : "border-line hover:border-line-bright"
      }`}
    >
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="truncate font-medium text-ink">{member.collector.label}</h3>
          <p className="mt-1 truncate font-mono text-[11px] text-ink-faint">
            {member.collector.collectorId}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <div className="font-mono text-2xl font-semibold" style={{ color: colour }}>
            {member.score}
          </div>
          <div
            className="font-mono text-[10px] uppercase tracking-widest"
            style={{ color: colour }}
          >
            {severityLabel(member.severity)}
          </div>
        </div>
      </header>

      {/* Composite breakdown */}
      <dl className="mt-4 grid grid-cols-3 gap-2 border-y border-line py-3">
        {[
          ["coverage", member.coverage],
          ["schema", member.schemaConformance],
          ["yield", member.yieldRatio],
        ].map(([label, value]) => (
          <div key={label as string}>
            <dt className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">
              {label as string}
            </dt>
            <dd className="mt-0.5 font-mono text-sm text-ink">{pct(value as number)}</dd>
          </div>
        ))}
      </dl>

      {/* Field-level occupancy */}
      <ul className="mt-4 space-y-2">
        {member.fields.map((field) => (
          <li key={field.field} className="flex items-center gap-3">
            <span className="w-28 shrink-0 truncate font-mono text-[11px] text-ink-muted">
              {field.field}
            </span>
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
              <span
                className="block h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.max(field.fillRate * 100, field.absent ? 0 : 2)}%`,
                  background: field.absent ? TONE_HEX.bad : colour,
                }}
              />
            </span>
            <span
              className="w-14 shrink-0 text-right font-mono text-[11px]"
              style={{ color: field.absent ? TONE_HEX.bad : "var(--color-ink-muted)" }}
            >
              {field.absent ? "absent" : pct(field.fillRate)}
            </span>
          </li>
        ))}
      </ul>

      {member.evidence.length > 0 && (
        <div className="mt-4 rounded-lg border border-vital-bad/25 bg-vital-bad/5 p-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-vital-bad">
            sentinel evidence
          </p>
          <ul className="mt-1.5 space-y-1">
            {member.evidence.map((line) => (
              <li key={line} className="text-[12px] leading-relaxed text-ink-muted">
                {line}
              </li>
            ))}
          </ul>
        </div>
      )}

      <footer className="mt-4 flex items-center justify-between gap-3">
        <span className="font-mono text-[11px] text-ink-faint">
          {member.rowCount} rows · {relativeTime(member.lastSeen)}
        </span>
        <div className="flex gap-2">
          <button
            onClick={(event) => {
              event.stopPropagation();
              onObserve();
            }}
            disabled={busy}
            className="rounded-md border border-line-bright px-2.5 py-1 font-mono text-[11px] text-ink-muted transition-colors hover:border-silk/50 hover:text-ink disabled:opacity-40"
          >
            {busy ? "running…" : "observe"}
          </button>
          <button
            onClick={(event) => {
              event.stopPropagation();
              onHeal();
            }}
            disabled={busy || !needsHeal}
            className="rounded-md border border-silk/40 bg-silk/10 px-2.5 py-1 font-mono text-[11px] text-silk transition-colors hover:bg-silk/20 disabled:opacity-30"
          >
            heal
          </button>
        </div>
      </footer>
    </article>
  );
}
