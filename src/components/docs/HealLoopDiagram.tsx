"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

/**
 * The healing loop, drawn as an actual loop.
 *
 * A flowchart would imply a beginning and an end, and the point of this system
 * is that there is neither: it runs forever, and a repair is one branch through
 * a cycle rather than an incident with a start and a stop. Arranging the seven
 * stages on a ring says that before a single word is read.
 */

interface Stage {
  key: string;
  label: string;
  detail: string;
  /** Stages that only execute when drift was actually found. */
  conditional?: boolean;
}

const STAGES: Stage[] = [
  { key: "observe", label: "Observe", detail: "Run the collector against its target and record every row it returned." },
  { key: "measure", label: "Measure", detail: "Compute per-field fill rate, schema conformance and row yield for the run." },
  { key: "diagnose", label: "Diagnose", detail: "Compare those vitals against a baseline built from prior healthy runs." },
  { key: "compose", label: "Compose", detail: "Write the repair prompt from the evidence, naming the broken fields and fencing off the working ones.", conditional: true },
  { key: "heal", label: "Heal", detail: "Dispatch the prompt through bdata scraper heal. Bright Data rewrites the extraction code.", conditional: true },
  { key: "approve", label: "Approve", detail: "Gate the proposed patch into production, or reject it.", conditional: true },
  { key: "verify", label: "Verify", detail: "Re-run the collector and record the new score next to the one it replaced.", conditional: true },
];

const SIZE = 460;
const CENTER = SIZE / 2;
const RADIUS = 168;
const ADVANCE_MS = 2800;

const nodeAt = (index: number) => {
  const angle = (index / STAGES.length) * Math.PI * 2 - Math.PI / 2;
  return {
    x: CENTER + Math.cos(angle) * RADIUS,
    y: CENTER + Math.sin(angle) * RADIUS,
    angle,
  };
};

export function HealLoopDiagram() {
  const [active, setActive] = useState(0);
  const [pinned, setPinned] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    // A diagram that moves on its own is a distraction for anyone who asked for
    // less motion, and pinning means the reader is driving.
    if (pinned || reduceMotion) return;

    const timer = setInterval(
      () => setActive((current) => (current + 1) % STAGES.length),
      ADVANCE_MS,
    );
    return () => clearInterval(timer);
  }, [pinned, reduceMotion]);

  const stage = STAGES[active];

  return (
    <div className="grid gap-6 rounded-xl border border-line bg-surface/60 p-6 lg:grid-cols-[460px_1fr] lg:items-center">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="mx-auto h-auto w-full max-w-[460px]"
        role="img"
        aria-label="The seven stage healing loop: observe, measure, diagnose, compose, heal, approve, verify, returning to observe."
      >
        {/* Ring the stages sit on */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          fill="none"
          stroke="var(--line)"
          strokeWidth="1"
        />

        {/* Progress arc sweeping to the active stage */}
        <motion.circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          fill="none"
          stroke="var(--silk)"
          strokeWidth="1.75"
          strokeLinecap="round"
          pathLength={1}
          initial={false}
          animate={{ pathLength: (active + 1) / STAGES.length }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          style={{ rotate: -90, transformOrigin: "center" }}
        />

        {STAGES.map((item, index) => {
          const { x, y } = nodeAt(index);
          const isActive = index === active;
          const isPast = index < active;

          return (
            <g
              key={item.key}
              role="button"
              tabIndex={0}
              aria-label={`${item.label}. ${item.detail}`}
              className="cursor-pointer"
              onClick={() => {
                setActive(index);
                setPinned(true);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setActive(index);
                  setPinned(true);
                }
              }}
            >
              {isActive && (
                <motion.circle
                  cx={x}
                  cy={y}
                  r={26}
                  fill="var(--silk)"
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 0.16, scale: 1 }}
                  style={{ transformBox: "fill-box", transformOrigin: "center" }}
                />
              )}

              <circle
                cx={x}
                cy={y}
                r={15}
                fill="var(--surface)"
                stroke={isActive || isPast ? "var(--silk)" : "var(--line-bright)"}
                strokeWidth={isActive ? 2 : 1.2}
                strokeDasharray={item.conditional && !isActive && !isPast ? "3 3" : undefined}
              />

              <text
                x={x}
                y={y + 4}
                textAnchor="middle"
                className="text-[11px] font-semibold"
                fill={isActive || isPast ? "var(--silk)" : "var(--ink-faint)"}
                style={{ fontFamily: "var(--font-jetbrains-mono)" }}
              >
                {index + 1}
              </text>

              <text
                x={x}
                y={y + (y < CENTER ? -26 : 34)}
                textAnchor="middle"
                className="text-[12px] font-medium"
                fill={isActive ? "var(--ink)" : "var(--ink-muted)"}
                stroke="var(--void)"
                strokeWidth="3.5"
                paintOrder="stroke"
                style={{ fontFamily: "var(--font-archivo)" }}
              >
                {item.label}
              </text>
            </g>
          );
        })}

        {/* Centre reads out the active stage number */}
        <text
          x={CENTER}
          y={CENTER - 4}
          textAnchor="middle"
          className="text-[13px] uppercase tracking-[0.2em]"
          fill="var(--ink-faint)"
          style={{ fontFamily: "var(--font-jetbrains-mono)" }}
        >
          stage
        </text>
        <text
          x={CENTER}
          y={CENTER + 30}
          textAnchor="middle"
          className="text-[32px]"
          fill="var(--silk)"
          style={{ fontFamily: "var(--font-instrument-serif)" }}
        >
          {active + 1}
        </text>
      </svg>

      <div className="min-w-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={stage.key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
          >
            <div className="flex items-center gap-2.5">
              <h3 className="text-[19px] font-semibold tracking-tight text-ink">
                {stage.label}
              </h3>
              {stage.conditional && (
                <span className="rounded border border-line-bright px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-faint">
                  only on drift
                </span>
              )}
            </div>
            <p className="mt-2.5 max-w-[46ch] text-[14.5px] leading-[1.7] text-ink-muted">
              {stage.detail}
            </p>
          </motion.div>
        </AnimatePresence>

        <p className="mt-5 font-mono text-[11px] text-ink-faint">
          {pinned ? "Click any stage to explore." : "Cycling. Click a stage to pin it."}
        </p>
      </div>
    </div>
  );
}
