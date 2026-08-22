"use client";

import { TONE_HEX, vitalTone } from "@/lib/format";
import type { FleetMember } from "@/services/state";

/**
 * The Web — the fleet rendered as an orb web rather than a row of cards.
 *
 * Each collector sits on its own radial thread. The thread is the connection
 * Spinneret maintains to that source, so its condition carries the meaning: solid
 * silk while the collector honours its contract, frayed and dimmed the moment it
 * stops. Health becomes something you read in the shape of the web at a glance,
 * before reading a single number.
 */

const CENTER_X = 400;
const CENTER_Y = 250;
const SPOKE_COUNT = 12;
const RING_RADII = [58, 96, 134, 172, 208];
const NODE_RADIUS = 150;

interface Props {
  members: FleetMember[];
  onSelect: (slug: string) => void;
  selected?: string;
}

const polar = (angle: number, radius: number) => ({
  x: CENTER_X + Math.cos(angle) * radius,
  y: CENTER_Y + Math.sin(angle) * radius,
});

/** Spokes and capture spiral form the static scaffold the collectors hang from. */
function buildScaffold() {
  const spokes = Array.from({ length: SPOKE_COUNT }, (_, index) => {
    const angle = (index / SPOKE_COUNT) * Math.PI * 2 - Math.PI / 2;
    return polar(angle, RING_RADII[RING_RADII.length - 1]);
  });

  const rings = RING_RADII.map((radius) => {
    const points = Array.from({ length: SPOKE_COUNT + 1 }, (_, index) => {
      const angle = (index / SPOKE_COUNT) * Math.PI * 2 - Math.PI / 2;
      // Pull each segment slightly inward so the ring sags between spokes the
      // way real capture silk does, instead of reading as a machined polygon.
      const sag = index % 1 === 0 ? radius : radius * 0.94;
      return polar(angle, sag);
    });
    return points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
  });

  return { spokes, rings };
}

export function WebCanvas({ members, onSelect, selected }: Props) {
  const { spokes, rings } = buildScaffold();

  // Collectors are spread across the upper arc so labels never collide.
  const placed = members.map((member, index) => {
    const spread = members.length === 1 ? 0 : index / (members.length - 1) - 0.5;
    const angle = -Math.PI / 2 + spread * 1.9;
    return { member, angle, point: polar(angle, NODE_RADIUS) };
  });

  return (
    <svg
      viewBox="0 0 800 480"
      className="w-full h-auto select-none"
      role="img"
      aria-label="Collector fleet rendered as a spider web, thread condition showing collector health"
    >
      <defs>
        <radialGradient id="core-glow">
          <stop offset="0%" stopColor="#f0b429" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#f0b429" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Static scaffold */}
      <g stroke="#232838" strokeWidth="0.7" fill="none" opacity="0.75">
        {spokes.map((end, index) => (
          <line key={`spoke-${index}`} x1={CENTER_X} y1={CENTER_Y} x2={end.x} y2={end.y} />
        ))}
        {rings.map((points, index) => (
          <polyline key={`ring-${index}`} points={points} />
        ))}
      </g>

      <circle cx={CENTER_X} cy={CENTER_Y} r={70} fill="url(#core-glow)" />

      {/* Live threads: one per collector */}
      {placed.map(({ member, point }) => {
        const tone = vitalTone(member.score);
        const colour = TONE_HEX[tone];
        const broken = tone === "bad" || tone === "dead";

        return (
          <g
            key={member.collector.slug}
            onClick={() => onSelect(member.collector.slug)}
            className="cursor-pointer"
          >
            <line
              x1={CENTER_X}
              y1={CENTER_Y}
              x2={point.x}
              y2={point.y}
              stroke={colour}
              strokeWidth={selected === member.collector.slug ? 2.4 : 1.5}
              opacity={broken ? 0.45 : 0.9}
              strokeDasharray={broken ? "3 7" : undefined}
              className={broken ? undefined : "thread-travel"}
            />

            <circle
              cx={point.x}
              cy={point.y}
              r={17}
              fill={colour}
              opacity={0.16}
              className={`pulse-${tone === "dead" ? "warn" : tone}`}
            />
            <circle
              cx={point.x}
              cy={point.y}
              r={7.5}
              fill={colour}
              stroke="#06070a"
              strokeWidth="2"
            />

            <text
              x={point.x}
              y={point.y - 30}
              textAnchor="middle"
              className="fill-[#e8eaf0] text-[13px] font-medium"
            >
              {member.collector.label}
            </text>
            <text
              x={point.x}
              y={point.y + 36}
              textAnchor="middle"
              fill={colour}
              className="text-[15px] font-mono font-semibold"
            >
              {member.score}
            </text>
            <text
              x={point.x}
              y={point.y + 51}
              textAnchor="middle"
              className="fill-[#5a6178] text-[10px] font-mono uppercase tracking-widest"
            >
              {member.rowCount} rows
            </text>
          </g>
        );
      })}

      {/* Hub */}
      <circle cx={CENTER_X} cy={CENTER_Y} r={26} fill="#0c0e14" stroke="#f0b429" strokeWidth="1.2" />
      <text
        x={CENTER_X}
        y={CENTER_Y + 4}
        textAnchor="middle"
        className="fill-[#f0b429] text-[10px] font-mono uppercase tracking-[0.2em]"
      >
        hub
      </text>
    </svg>
  );
}
