"use client";

import { useCallback, useMemo, useState } from "react";
import { CompanyDrawer } from "@/components/CompanyDrawer";
import { Console } from "@/components/Console";
import { HealLedger } from "@/components/HealLedger";
import { SignalBoard } from "@/components/SignalBoard";
import { VitalCard } from "@/components/VitalCard";
import { WebCanvas } from "@/components/WebCanvas";
import { useFleetStream } from "@/hooks/useFleetStream";
import { TONE_HEX, vitalTone } from "@/lib/format";

type Tab = "signals" | "heals";

export default function Dashboard() {
  const { state, connected } = useFleetStream();
  const [selected, setSelected] = useState<string>();
  const [tab, setTab] = useState<Tab>("signals");
  const [busySlug, setBusySlug] = useState<string>();
  const [openCompany, setOpenCompany] = useState<string>();

  /** Fire an action and let the event stream report what happens next. */
  const dispatch = useCallback(
    async (path: string, body: Record<string, unknown>) => {
      setBusySlug(body.slug as string);
      try {
        await fetch(`/api/${path}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } finally {
        // Cleared optimistically; the console carries the authoritative progress.
        setTimeout(() => setBusySlug(undefined), 4000);
      }
    },
    [],
  );

  const summary = state?.summary;
  const fleetTone = vitalTone(summary?.fleetHealth ?? 0);

  const filteredSignals = useMemo(() => {
    if (!state) return [];
    return selected
      ? state.signals.filter((signal) => signal.collectorSlug === selected)
      : state.signals;
  }, [state, selected]);

  return (
    <main className="relative z-10 mx-auto max-w-[1400px] px-6 py-8">
      {/* ---------------------------------------------------------------- header */}
      <header className="flex flex-wrap items-end justify-between gap-6 border-b border-line pb-6">
        <div>
          <div className="flex items-center gap-3">
            <SpinneretMark />
            <h1 className="text-[26px] font-semibold tracking-tight text-ink">
              Spinneret
            </h1>
            <span className="rounded border border-silk/30 bg-silk/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-silk">
              self-healing lead radar
            </span>
          </div>
          <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-ink-muted">
            Watches niche public sources for buying signals, measures its own
            scrapers after every run, and repairs them from evidence — writing the
            repair prompt itself, without a human describing what broke.
          </p>
        </div>

        <div className="flex items-center gap-6">
          <Stat label="fleet health" value={`${summary?.fleetHealth ?? 0}`} colour={TONE_HEX[fleetTone]} />
          <Stat label="signals" value={`${summary?.totalSignals ?? 0}`} />
          <Stat label="heals verified" value={`${summary?.healsVerified ?? 0}`} />
          <div className="flex items-center gap-2">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                connected ? "animate-pulse bg-vital-good" : "bg-vital-bad"
              }`}
            />
            <span className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">
              {connected ? "live" : "offline"}
            </span>
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------------ web */}
      <section className="mt-8 grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <div className="rounded-xl border border-line bg-surface/60 p-2">
          {state && (
            <WebCanvas
              members={state.members}
              selected={selected}
              onSelect={(slug) => setSelected(slug === selected ? undefined : slug)}
            />
          )}
        </div>

        <div className="h-[420px]">
          <Console events={state?.events ?? []} />
        </div>
      </section>

      {/* -------------------------------------------------------------- vitals */}
      <section className="mt-8">
        <SectionHeading
          title="Collector vitals"
          note="every score is measured from the last real run, not asserted"
        />
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {state?.members.map((member) => (
            <VitalCard
              key={member.collector.slug}
              member={member}
              selected={selected === member.collector.slug}
              busy={busySlug === member.collector.slug}
              onSelect={() =>
                setSelected(
                  member.collector.slug === selected ? undefined : member.collector.slug,
                )
              }
              onObserve={() => dispatch("observe", { slug: member.collector.slug })}
              onHeal={() => dispatch("heal", { slug: member.collector.slug })}
            />
          ))}
        </div>
      </section>

      {/* ----------------------------------------------------- signals / ledger */}
      <section className="mt-10 pb-16">
        <div className="flex items-center gap-1 border-b border-line">
          {(
            [
              ["signals", `Buying signals${selected ? " · filtered" : ""}`],
              ["heals", "Heal ledger"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`-mb-px border-b-2 px-4 py-2.5 font-mono text-[11px] uppercase tracking-widest transition-colors ${
                tab === key
                  ? "border-silk text-silk"
                  : "border-transparent text-ink-faint hover:text-ink-muted"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-5">
          {tab === "signals" ? (
            <SignalBoard signals={filteredSignals} onOpenCompany={setOpenCompany} />
          ) : (
            <HealLedger
              heals={state?.heals ?? []}
              busySlug={busySlug}
              onApprove={(slug, healId) => dispatch("approve", { slug, healId })}
            />
          )}
        </div>
      </section>

      <CompanyDrawer
        company={openCompany}
        signals={state?.signals ?? []}
        onClose={() => setOpenCompany(undefined)}
      />
    </main>
  );
}

/* ------------------------------------------------------------------ fragments */

function Stat({ label, value, colour }: { label: string; value: string; colour?: string }) {
  return (
    <div className="text-right">
      <div
        className="font-mono text-xl font-semibold"
        style={{ color: colour ?? "var(--color-ink)" }}
      >
        {value}
      </div>
      <div className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">
        {label}
      </div>
    </div>
  );
}

function SectionHeading({ title, note }: { title: string; note: string }) {
  return (
    <div className="flex flex-wrap items-baseline gap-3">
      <h2 className="text-lg font-medium text-ink">{title}</h2>
      <p className="font-mono text-[11px] text-ink-faint">{note}</p>
    </div>
  );
}

/** Eight radial threads from a hub — the mark is the product's own diagram. */
function SpinneretMark() {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
      {Array.from({ length: 8 }, (_, index) => {
        const angle = (index / 8) * Math.PI * 2;
        return (
          <line
            key={index}
            x1={15}
            y1={15}
            x2={15 + Math.cos(angle) * 13}
            y2={15 + Math.sin(angle) * 13}
            stroke="#f0b429"
            strokeWidth="1"
            opacity={0.75}
          />
        );
      })}
      <circle cx="15" cy="15" r="9" fill="none" stroke="#f0b429" strokeWidth="0.8" opacity="0.5" />
      <circle cx="15" cy="15" r="4.5" fill="none" stroke="#f0b429" strokeWidth="0.8" opacity="0.8" />
      <circle cx="15" cy="15" r="2" fill="#f0b429" />
    </svg>
  );
}
