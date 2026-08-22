"use client";

import { TONE_HEX, vitalTone } from "@/lib/format";

/**
 * Health score over recent runs.
 *
 * This is the drift proof. A single score says what is true now; the line says
 * whether the collector fell and whether a heal actually brought it back — which
 * is the only way to distinguish a repair from a lucky run.
 */

interface Props {
  history: number[];
  width?: number;
  height?: number;
}

export function Sparkline({ history, width = 150, height = 34 }: Props) {
  if (history.length < 2) {
    return (
      <div
        style={{ width, height }}
        className="flex items-center font-mono text-[10px] text-ink-faint"
      >
        awaiting history
      </div>
    );
  }

  // Inset by the marker radius so end points sit inside the box instead of
  // bleeding over the card edge.
  const PAD = 4;
  const plotW = width - PAD * 2;
  const plotH = height - PAD * 2;

  // Fixed 0-100 domain rather than min/max: an auto-scaled axis would make a
  // trivial wobble look like a collapse.
  const stepX = plotW / (history.length - 1);
  const toX = (index: number) => PAD + index * stepX;
  const toY = (score: number) => PAD + plotH - (score / 100) * plotH;

  const line = history.map((score, index) => `${toX(index)},${toY(score)}`).join(" ");
  const area = `${PAD},${height - PAD} ${line} ${width - PAD},${height - PAD}`;

  const latest = history[history.length - 1];
  const tone = vitalTone(latest);
  const colour = TONE_HEX[tone];

  // Any run that recovered by a wide margin is worth marking — it is where a
  // heal landed.
  const recoveryIndex = history.findIndex(
    (score, index) => index > 0 && score - history[index - 1] >= 25,
  );

  return (
    <svg width={width} height={height} aria-hidden="true">
      <polygon points={area} fill={colour} opacity={0.1} />
      <polyline
        points={line}
        fill="none"
        stroke={colour}
        strokeWidth="1.4"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Ring rather than a filled dot, so it stays visible when the recovery
          is also the most recent point — which is the common case. */}
      {recoveryIndex > 0 && (
        <circle
          cx={toX(recoveryIndex)}
          cy={toY(history[recoveryIndex])}
          r="4.5"
          fill="none"
          stroke="#f0b429"
          strokeWidth="1.3"
        />
      )}
      <circle cx={toX(history.length - 1)} cy={toY(latest)} r="2.4" fill={colour} />
    </svg>
  );
}
