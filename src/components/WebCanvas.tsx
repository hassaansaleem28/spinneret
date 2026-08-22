"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { TONE_HEX, vitalTone } from "@/lib/format";
import type { FleetMember } from "@/services/state";

/**
 * The Web — the fleet drawn as an orb web rather than a row of cards.
 *
 * Each collector hangs on its own radial thread. The thread carries the meaning:
 * solid silk while the collector honours its contract, frayed and dimmed the
 * moment it stops. Health becomes something you read in the shape of the web,
 * before reading a single number.
 *
 * GSAP spins the scaffold in on load — a spider builds radials first, then the
 * capture spiral, and the animation follows that order because it makes the
 * structure legible rather than just decorative.
 */

const CENTER_X = 400;
const CENTER_Y = 260;
const SPOKE_COUNT = 14;
const RING_RADII = [62, 104, 146, 188, 224];
const NODE_RADIUS = 158;

/**
 * Cropped to the drawing's actual extent rather than the full coordinate grid.
 * On a 0 0 800 520 box the web sits letterboxed inside its column with dead
 * margin on every side.
 *
 * The horizontal bounds are set by the node *labels*, not the rings — a long
 * collector name overhangs the outermost ring by a wide margin, and cropping to
 * the geometry alone clips it.
 */
const VIEW_BOX = "122 40 556 470";

interface Props {
  members: FleetMember[];
  onSelect: (slug: string) => void;
  selected?: string;
}

const polar = (angle: number, radius: number) => ({
  x: CENTER_X + Math.cos(angle) * radius,
  y: CENTER_Y + Math.sin(angle) * radius,
});

function buildScaffold() {
  const spokes = Array.from({ length: SPOKE_COUNT }, (_, index) => {
    const angle = (index / SPOKE_COUNT) * Math.PI * 2 - Math.PI / 2;
    return polar(angle, RING_RADII[RING_RADII.length - 1]);
  });

  const rings = RING_RADII.map((radius) => {
    const points = Array.from({ length: SPOKE_COUNT + 1 }, (_, index) => {
      const angle = (index / SPOKE_COUNT) * Math.PI * 2 - Math.PI / 2;
      return polar(angle, radius);
    });
    return points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
  });

  return { spokes, rings };
}

export function WebCanvas({ members, onSelect, selected }: Props) {
  const { spokes, rings } = buildScaffold();
  const scaffoldRef = useRef<SVGGElement>(null);
  const nodesRef = useRef<SVGGElement>(null);

  useEffect(() => {
    // Users who ask for less motion get the finished web immediately.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const scaffold = scaffoldRef.current;
    const nodes = nodesRef.current;
    if (!scaffold || !nodes) return;

    const strands = scaffold.querySelectorAll<SVGGeometryElement>("line, polyline");
    const context = gsap.context(() => {
      // Radials first, then the spiral — the order a spider actually works in.
      gsap.fromTo(
        strands,
        { strokeDasharray: 620, strokeDashoffset: 620, opacity: 0 },
        {
          strokeDashoffset: 0,
          opacity: 1,
          duration: 1.1,
          stagger: 0.028,
          ease: "power2.out",
        },
      );

      gsap.fromTo(
        nodes.children,
        { opacity: 0, scale: 0.6 },
        {
          opacity: 1,
          scale: 1,
          duration: 0.55,
          delay: 0.75,
          stagger: 0.12,
          ease: "back.out(1.6)",
          transformOrigin: "center",
        },
      );
    });

    return () => context.revert();
  }, [members.length]);

  // Collectors spread across the upper arc so labels never collide.
  const placed = members.map((member, index) => {
    const spread = members.length === 1 ? 0 : index / (members.length - 1) - 0.5;
    const angle = -Math.PI / 2 + spread * 1.95;
    return { member, point: polar(angle, NODE_RADIUS) };
  });

  return (
    <svg
      viewBox={VIEW_BOX}
      className="h-auto w-full select-none"
      role="img"
      aria-label={`Collector fleet drawn as a spider web. ${members
        .map((m) => `${m.collector.label}: health ${m.score} of 100`)
        .join(". ")}`}
    >
      <defs>
        <radialGradient id="hub-glow">
          <stop offset="0%" stopColor="var(--silk)" stopOpacity="0.5" />
          <stop offset="100%" stopColor="var(--silk)" stopOpacity="0" />
        </radialGradient>
      </defs>

      <g ref={scaffoldRef} stroke="#232838" strokeWidth="0.7" fill="none" opacity="0.7">
        {spokes.map((end, index) => (
          <line key={`spoke-${index}`} x1={CENTER_X} y1={CENTER_Y} x2={end.x} y2={end.y} />
        ))}
        {rings.map((points, index) => (
          <polyline key={`ring-${index}`} points={points} />
        ))}
      </g>

      <circle cx={CENTER_X} cy={CENTER_Y} r={78} fill="url(#hub-glow)" />

      <g ref={nodesRef}>
        {placed.map(({ member, point }) => {
          const tone = vitalTone(member.score);
          const colour = TONE_HEX[tone];
          const broken = tone === "bad" || tone === "dead";
          const active = selected === member.collector.slug;

          return (
            <g
              key={member.collector.slug}
              onClick={() => onSelect(member.collector.slug)}
              className="cursor-pointer"
              role="button"
              tabIndex={0}
              aria-label={`${member.collector.label}, health ${member.score} of 100`}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(member.collector.slug);
                }
              }}
            >
              <line
                x1={CENTER_X}
                y1={CENTER_Y}
                x2={point.x}
                y2={point.y}
                stroke={colour}
                strokeWidth={active ? 2.4 : 1.5}
                opacity={broken ? 0.45 : 0.9}
                strokeDasharray={broken ? "3 7" : undefined}
                className={broken ? undefined : "thread-travel"}
              />

              <circle
                cx={point.x}
                cy={point.y}
                r={18}
                fill={colour}
                opacity={0.15}
                className={`pulse-${tone === "dead" ? "warn" : tone}`}
              />
              <circle
                cx={point.x}
                cy={point.y}
                r={active ? 9 : 7.5}
                fill={colour}
                stroke="var(--void)"
                strokeWidth="2.5"
              />

              <text
                x={point.x}
                y={point.y - 30}
                textAnchor="middle"
                className="fill-[var(--ink)] text-[12px] font-medium"
                stroke="var(--void)"
                strokeWidth="4"
                paintOrder="stroke"
                style={{ fontFamily: "var(--font-archivo)" }}
              >
                {member.collector.label}
              </text>
              <text
                x={point.x}
                y={point.y + 36}
                textAnchor="middle"
                fill={colour}
                className="text-[15.5px] font-semibold"
                stroke="var(--void)"
                strokeWidth="4"
                paintOrder="stroke"
                style={{ fontFamily: "var(--font-jetbrains-mono)", fontVariantNumeric: "tabular-nums" }}
              >
                {member.score}
              </text>
              <text
                x={point.x}
                y={point.y + 50}
                textAnchor="middle"
                className="fill-[var(--ink-faint)] text-[9px] uppercase tracking-[0.14em]"
                stroke="var(--void)"
                strokeWidth="3.5"
                paintOrder="stroke"
                style={{ fontFamily: "var(--font-jetbrains-mono)" }}
              >
                {member.rowCount} rows
              </text>
            </g>
          );
        })}
      </g>

      <circle
        cx={CENTER_X}
        cy={CENTER_Y}
        r={28}
        fill="var(--surface)"
        stroke="var(--silk)"
        strokeWidth="1.2"
      />
      <text
        x={CENTER_X}
        y={CENTER_Y + 4}
        textAnchor="middle"
        className="fill-[var(--silk)] text-[9.5px] uppercase tracking-[0.22em]"
        style={{ fontFamily: "var(--font-jetbrains-mono)" }}
      >
        hub
      </text>
    </svg>
  );
}
