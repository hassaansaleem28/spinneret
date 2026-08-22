"use client";

import { useCallback, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CompanyDrawer } from "@/components/CompanyDrawer";
import { Console } from "@/components/Console";
import { HealLedger } from "@/components/HealLedger";
import { Navbar } from "@/components/Navbar";
import { SignalBoard } from "@/components/SignalBoard";
import { VitalCard } from "@/components/VitalCard";
import { WebCanvas } from "@/components/WebCanvas";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFleetStream } from "@/hooks/useFleetStream";
import { TONE_HEX, vitalTone } from "@/lib/format";

/** Staggered entrance — one orchestrated page load rather than scattered fades. */
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
};

const rise = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] } },
} as const;

type SignalFilter = "all" | "hiring" | "directory" | "changelog";

export default function Dashboard() {
  const { state, connected } = useFleetStream();
  const [selected, setSelected] = useState<string>();
  const [openCompany, setOpenCompany] = useState<string>();
  const [busySlug, setBusySlug] = useState<string>();
  const [sweeping, setSweeping] = useState(false);
  const [filter, setFilter] = useState<SignalFilter>("all");

  /** Fire an action; the event stream carries the authoritative progress. */
  const dispatch = useCallback(async (path: string, body?: Record<string, unknown>) => {
    if (body?.slug) setBusySlug(body.slug as string);
    try {
      await fetch(`/api/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
    } finally {
      setTimeout(() => setBusySlug(undefined), 4000);
    }
  }, []);

  const onSweep = useCallback(async () => {
    setSweeping(true);
    await dispatch("sweep");
    setTimeout(() => setSweeping(false), 6000);
  }, [dispatch]);

  const summary = state?.summary;
  const fleetHealth = summary?.fleetHealth ?? 0;

  const visibleSignals = useMemo(() => {
    if (!state) return [];
    return state.signals
      .filter((signal) => (selected ? signal.collectorSlug === selected : true))
      .filter((signal) => (filter === "all" ? true : signal.kind === filter));
  }, [state, selected, filter]);

  return (
    <>
      <Navbar
        fleetHealth={fleetHealth}
        connected={connected}
        sweeping={sweeping}
        onSweep={onSweep}
      />

      <main className="relative z-10 mx-auto max-w-[1440px] px-6 pb-24">
        {/* ---------------------------------------------------------- hero */}
        <motion.section
          variants={container}
          initial="hidden"
          animate="show"
          className="grid gap-10 pt-16 pb-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center"
        >
          <div>
            <motion.div variants={rise}>
              <Badge
                variant="outline"
                className="border-silk/30 bg-silk/10 font-mono text-[10px] uppercase tracking-[0.2em] text-silk"
              >
                Self-Healing Lead Intelligence
              </Badge>
            </motion.div>

            <motion.h1
              variants={rise}
              className="mt-5 font-display text-[clamp(2.6rem,5.2vw,4.2rem)] leading-[1.02] tracking-[-0.02em] text-ink"
            >
              Find companies the week
              <br />
              they <em className="italic text-silk">start buying</em>.
            </motion.h1>

            <motion.p
              variants={rise}
              className="mt-6 max-w-[62ch] text-[16.5px] leading-[1.65] text-ink-muted"
            >
              A company is not a lead because it exists in a directory. It is a lead
              because something just changed — five revenue roles opened this week, a
              changelog shipped SSO, a new name appeared in a funding batch. Spinneret
              watches niche public sources for exactly those moments.
            </motion.p>

            <motion.p
              variants={rise}
              className="mt-4 max-w-[62ch] text-[16.5px] leading-[1.65] text-ink-muted"
            >
              The hard part is that those sources keep changing shape. A redesign
              lands, a selector stops matching, and most pipelines carry on returning
              rows that are quietly empty. Spinneret measures every run, notices the
              drift, <span className="text-ink">writes its own repair prompt</span>,
              and then proves the fix worked.
            </motion.p>

            <motion.dl variants={rise} className="mt-9 flex flex-wrap gap-x-10 gap-y-5">
              <Stat
                value={String(fleetHealth)}
                label="Fleet Health"
                colour={TONE_HEX[vitalTone(fleetHealth)]}
              />
              <Stat value={String(summary?.totalSignals ?? 0)} label="Signals Tracked" />
              <Stat value={String(summary?.healsVerified ?? 0)} label="Heals Verified" />
              <Stat value={String(state?.members.length ?? 0)} label="Live Collectors" />
            </motion.dl>
          </div>

          <motion.div variants={rise} className="min-w-0">
            {state && (
              <WebCanvas
                members={state.members}
                selected={selected}
                onSelect={(slug) => setSelected(slug === selected ? undefined : slug)}
              />
            )}
          </motion.div>
        </motion.section>

        {/* --------------------------------------------------------- fleet */}
        <Section
          id="fleet"
          title="Collector Vitals"
          note="Every score is measured from the last real run — never asserted."
        >
          <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
            <div className="grid min-w-0 gap-4 md:grid-cols-2">
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

            <div className="h-[560px] min-w-0">
              <Console events={state?.events ?? []} />
            </div>
          </div>
        </Section>

        {/* ------------------------------------------------------- signals */}
        <Section
          id="signals"
          title="Buying Signals"
          note="Every point of every score traces back to a stated rule."
        >
          <Tabs
            value={filter}
            onValueChange={(value) => setFilter(value as SignalFilter)}
          >
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="hiring">Hiring</TabsTrigger>
              <TabsTrigger value="directory">Directory</TabsTrigger>
              <TabsTrigger value="changelog">Changelog</TabsTrigger>
            </TabsList>

            <TabsContent value={filter} className="mt-5">
              {selected && (
                <p className="mb-3 font-mono text-[11px] text-ink-faint">
                  Filtered to {selected} —{" "}
                  <button
                    onClick={() => setSelected(undefined)}
                    className="text-silk underline underline-offset-4"
                  >
                    show all collectors
                  </button>
                </p>
              )}
              <SignalBoard signals={visibleSignals} onOpenCompany={setOpenCompany} />
            </TabsContent>
          </Tabs>
        </Section>

        {/* -------------------------------------------------------- ledger */}
        <Section
          id="ledger"
          title="Heal Ledger"
          note="Each entry pairs the prompt Spinneret wrote with the score before and after."
        >
          <HealLedger
            heals={state?.heals ?? []}
            busySlug={busySlug}
            onApprove={(slug, healId) => dispatch("approve", { slug, healId })}
          />
        </Section>
      </main>

      <CompanyDrawer
        company={openCompany}
        signals={state?.signals ?? []}
        onClose={() => setOpenCompany(undefined)}
      />
    </>
  );
}

/* ------------------------------------------------------------------ fragments */

function Stat({ value, label, colour }: { value: string; label: string; colour?: string }) {
  return (
    <div>
      <dd
        className="tabular font-mono text-[26px] font-semibold leading-none"
        style={{ color: colour ?? "var(--ink)" }}
      >
        {value}
      </dd>
      <dt className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
        {label}
      </dt>
    </div>
  );
}

function Section({
  id,
  title,
  note,
  children,
}: {
  id: string;
  title: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="scroll-mt-24 pt-14"
    >
      <div className="mb-6 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h2 className="font-display text-[30px] leading-none tracking-tight text-ink">
          {title}
        </h2>
        <p className="text-[13.5px] text-ink-faint">{note}</p>
      </div>
      {children}
    </motion.section>
  );
}
