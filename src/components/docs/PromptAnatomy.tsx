"use client";

import { useState } from "react";
import { motion } from "framer-motion";

/**
 * The anatomy of a machine-authored heal prompt.
 *
 * This is the real 403-character prompt Spinneret generated and dispatched for
 * the job-board collector, split into the four jobs each clause does. Showing the
 * genuine artefact rather than a sanitised example is the point: a reader can
 * check it against the heal ledger on the dashboard.
 */

interface Part {
  key: string;
  text: string;
  title: string;
  why: string;
}

const PARTS: Part[] = [
  {
    key: "target",
    text: "The scraper for Remote GTM job board (https://weworkremotely.com/categories/remote-sales-and-marketing-jobs) is returning incomplete data.",
    title: "Target",
    why: "Names the collector and the exact URL, so the healing AI fetches the same page Spinneret measured rather than guessing at the target.",
  },
  {
    key: "evidence",
    text: "Fields never returned as keys in the output: company_name, job_title, location, job_url.",
    title: "Evidence",
    why: "States the observed failure with the specific field names. This clause is generated from the run’s telemetry, never typed by a person. A vaguer version such as “the scraper is broken” produces a vaguer patch.",
  },
  {
    key: "instruction",
    text: "Re-derive selectors for company_name, job_title, location, job_url from the current live DOM",
    title: "Instruction",
    why: "Says what to do and where to look. Pointing at the live DOM matters because the old selectors are the thing that stopped working.",
  },
  {
    key: "contract",
    text: "and return the full contracted schema: company_name, job_title, location, job_url.",
    title: "Contract",
    why: "Restates the complete output shape, so a partial repair is not mistaken for success. When some fields still work, a fifth clause fences those off explicitly so the heal cannot regress them.",
  },
];

export function PromptAnatomy() {
  const [active, setActive] = useState<string>(PARTS[1].key);
  const selected = PARTS.find((part) => part.key === active) ?? PARTS[0];

  return (
    <div className="rounded-xl border border-line bg-surface/60 p-6">
      <p className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-silk">
        Dispatched Prompt · 403 chars
      </p>

      <p className="mt-3 font-mono text-[13px] leading-[1.9]">
        {PARTS.map((part) => {
          const isActive = part.key === active;
          return (
            <button
              key={part.key}
              onClick={() => setActive(part.key)}
              className={`rounded px-1 text-left transition-colors ${
                isActive
                  ? "bg-silk/20 text-ink"
                  : "text-ink-muted hover:bg-surface-2 hover:text-ink"
              }`}
            >
              {part.text}{" "}
            </button>
          );
        })}
      </p>

      <motion.div
        key={selected.key}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28 }}
        className="mt-5 rounded-lg border border-line bg-surface-2 p-4"
      >
        <h4 className="text-[14.5px] font-semibold text-ink">{selected.title}</h4>
        <p className="mt-1.5 max-w-[64ch] text-[13.5px] leading-[1.7] text-ink-muted">
          {selected.why}
        </p>
      </motion.div>

      <p className="mt-4 font-mono text-[11px] text-ink-faint">
        Click any clause to see the job it does.
      </p>
    </div>
  );
}
