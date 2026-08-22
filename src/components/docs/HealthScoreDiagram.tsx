"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

/**
 * Interactive health-score explainer.
 *
 * The formula is three weighted terms, which is easy to state and hard to feel.
 * Letting the reader flip between real scenarios and watch the same arithmetic
 * produce 100, 20 and 62 makes the weighting legible in a way a written formula
 * does not.
 */

interface Scenario {
  key: string;
  label: string;
  blurb: string;
  coverage: number;
  schema: number;
  yieldRatio: number;
}

/** These mirror runs that actually happened, not invented numbers. */
const SCENARIOS: Scenario[] = [
  {
    key: "healthy",
    label: "Meeting Contract",
    blurb: "Every contracted field present and populated. This is the changelog collector on a normal run.",
    coverage: 1,
    schema: 1,
    yieldRatio: 1,
  },
  {
    key: "schema-gap",
    label: "Schema Gap",
    blurb: "Rows came back, but none of the contracted fields exist as keys. This is the job board on its very first run, before any heal.",
    coverage: 0,
    schema: 0,
    yieldRatio: 1,
  },
  {
    key: "selector-drift",
    label: "Selector Drift",
    blurb: "The keys survive a redesign but the values hollow out. Row count is untouched, so pagination is fine and the break is field level.",
    coverage: 0.28,
    schema: 1,
    yieldRatio: 1,
  },
  {
    key: "pagination",
    label: "Pagination Break",
    blurb: "Fields are fine on the rows that came back, but only a fraction of them did. That points at the row selector, not the fields.",
    coverage: 0.95,
    schema: 1,
    yieldRatio: 0.16,
  },
];

const WEIGHTS = [
  { key: "coverage", label: "Coverage", weight: 0.5, blurb: "Mean fill rate across contracted fields" },
  { key: "schema", label: "Schema", weight: 0.3, blurb: "Fraction of contracted fields present as keys" },
  { key: "yield", label: "Yield", weight: 0.2, blurb: "Row count against the healthy baseline" },
] as const;

function toneFor(score: number): string {
  if (score >= 80) return "var(--vital-good)";
  if (score >= 55) return "var(--vital-warn)";
  return "var(--vital-bad)";
}

export function HealthScoreDiagram() {
  const [active, setActive] = useState(0);
  const scenario = SCENARIOS[active];

  const values = {
    coverage: scenario.coverage,
    schema: scenario.schema,
    yield: scenario.yieldRatio,
  };

  const score = Math.round(
    (scenario.coverage * 0.5 + scenario.schema * 0.3 + scenario.yieldRatio * 0.2) * 100,
  );

  return (
    <div className="rounded-xl border border-line bg-surface/60 p-6">
      <div className="flex flex-wrap gap-2">
        {SCENARIOS.map((item, index) => (
          <Button
            key={item.key}
            variant={index === active ? "default" : "outline"}
            size="sm"
            onClick={() => setActive(index)}
            className="font-mono text-[11px]"
          >
            {item.label}
          </Button>
        ))}
      </div>

      <p className="mt-4 max-w-[62ch] text-[14px] leading-[1.7] text-ink-muted">
        {scenario.blurb}
      </p>

      <div className="mt-6 grid gap-6 sm:grid-cols-[1fr_auto] sm:items-center">
        <ul className="space-y-4">
          {WEIGHTS.map((term) => {
            const value = values[term.key as keyof typeof values];
            const contribution = value * term.weight * 100;

            return (
              <li key={term.key}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[13.5px] font-medium text-ink">
                    {term.label}
                    <span className="ml-2 font-mono text-[11px] text-ink-faint">
                      × {term.weight}
                    </span>
                  </span>
                  <span className="tabular font-mono text-[12px] text-ink-muted">
                    {Math.round(value * 100)}% → +{Math.round(contribution)}
                  </span>
                </div>

                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-line">
                  <motion.div
                    className="h-full rounded-full"
                    animate={{ width: `${value * 100}%` }}
                    transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                    style={{ background: toneFor(value * 100) }}
                  />
                </div>
                <p className="mt-1 text-[12px] text-ink-faint">{term.blurb}</p>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-4 border-t border-line pt-5 sm:border-l sm:border-t-0 sm:pl-8 sm:pt-0">
          <div className="text-center">
            <motion.div
              key={score}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="tabular font-mono text-[52px] font-semibold leading-none"
              style={{ color: toneFor(score) }}
            >
              {score}
            </motion.div>
            <p className="mt-2 font-mono text-[9.5px] uppercase tracking-[0.18em] text-ink-faint">
              Composite
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
