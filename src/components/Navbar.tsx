"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Activity, Menu, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TONE_COLOR, vitalTone } from "@/lib/format";

/**
 * Sticky command bar.
 *
 * The two facts an operator needs without scrolling are whether the feed is live
 * and how the fleet is doing, so both sit permanently in the bar. Section links
 * are real anchors rather than click handlers, which keeps them keyboard- and
 * middle-click-friendly.
 */

const SECTIONS = [
  { href: "/#fleet", label: "Fleet" },
  { href: "/#signals", label: "Signals" },
  { href: "/#ledger", label: "Ledger" },
  { href: "/docs", label: "Docs" },
] as const;

interface Props {
  fleetHealth: number;
  connected: boolean;
  sweeping: boolean;
  readOnly: boolean;
  onSweep: () => void;
}

export function Navbar({ fleetHealth, connected, sweeping, readOnly, onSweep }: Props) {
  const tone = vitalTone(fleetHealth);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <motion.header
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="sticky top-0 z-50 border-b border-line/80 bg-void/80 backdrop-blur-xl"
    >
      <nav
        aria-label="Primary"
        className="mx-auto flex h-16 max-w-[1440px] items-center gap-6 px-6"
      >
        <Link href="/#fleet" className="flex shrink-0 items-center gap-2.5">
          <SpinneretMark />
          <span className="font-display text-[22px] leading-none tracking-tight text-ink">
            Spinneret
          </span>
        </Link>

        <Separator orientation="vertical" className="hidden h-5 md:block" />

        <ul className="hidden items-center gap-1 md:flex">
          {SECTIONS.map((section) => (
            <li key={section.href}>
              <Link
                href={section.href}
                className="rounded-md px-3 py-1.5 text-[13.5px] font-medium text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
              >
                {section.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="ml-auto flex items-center gap-4">
          {/* Fleet health, always visible */}
          <Tooltip>
            <TooltipTrigger
              render={
                <div className="hidden items-center gap-2 sm:flex">
                  <Activity className="size-3.5 text-ink-faint" aria-hidden="true" />
                  <span
                    className="tabular font-mono text-sm font-semibold"
                    style={{ color: TONE_COLOR[tone] }}
                  >
                    {fleetHealth}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
                    fleet
                  </span>
                </div>
              }
            />
            <TooltipContent>
              Mean health across every collector, measured on its last real run
            </TooltipContent>
          </Tooltip>

          {/* Stream status. A snapshot build says so rather than claiming to be live. */}
          <Tooltip>
            <TooltipTrigger
              render={
                <div className="flex items-center gap-2" aria-live="polite">
                  <span className="relative flex size-2">
                    {connected && !readOnly && (
                      <span className="absolute inline-flex size-full animate-ping rounded-full bg-vital-good opacity-60" />
                    )}
                    <span
                      className={`relative inline-flex size-2 rounded-full ${
                        readOnly
                          ? "bg-silk"
                          : connected
                            ? "bg-vital-good"
                            : "bg-vital-bad"
                      }`}
                    />
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
                    {readOnly ? "Snapshot" : connected ? "Live" : "Offline"}
                  </span>
                </div>
              }
            />
            <TooltipContent>
              {readOnly
                ? "Showing recorded data from a real run. Collectors and heals run locally against Bright Data."
                : connected
                  ? "Streaming live updates every 2 seconds"
                  : "Not connected to the event stream"}
            </TooltipContent>
          </Tooltip>

          <ThemeToggle />

          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  size="sm"
                  onClick={onSweep}
                  disabled={sweeping || readOnly}
                  className="gap-1.5 font-medium"
                >
                  <Radio className="size-3.5" aria-hidden="true" />
                  {sweeping ? "Sweeping…" : "Run Sweep"}
                </Button>
              }
            />
            <TooltipContent>
              {readOnly
                ? "Unavailable on the hosted snapshot. Run npm run dev locally to sweep the fleet."
                : "Observe every collector and heal any that need it"}
            </TooltipContent>
          </Tooltip>

          {/* The desktop links collapse below md, so mobile gets the same
              destinations rather than being left to scroll and hope. */}
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger
              render={
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Open Navigation Menu"
                  className="size-8 md:hidden"
                >
                  <Menu className="size-4" aria-hidden="true" />
                </Button>
              }
            />
            <SheetContent side="right" className="border-line bg-surface sm:max-w-xs">
              <SheetHeader>
                <SheetTitle className="font-display text-2xl tracking-tight text-ink">
                  Spinneret
                </SheetTitle>
              </SheetHeader>

              <ul className="flex flex-col gap-1 px-4">
                {SECTIONS.map((section) => (
                  <li key={section.href}>
                    <Link
                      href={section.href}
                      onClick={() => setMenuOpen(false)}
                      className="block rounded-md px-3 py-2.5 text-[15px] font-medium text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
                    >
                      {section.label}
                    </Link>
                  </li>
                ))}
              </ul>

              <div className="mt-auto border-t border-line px-6 py-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
                  Fleet Health
                </p>
                <p
                  className="tabular mt-1 font-mono text-2xl font-semibold"
                  style={{ color: TONE_COLOR[tone] }}
                >
                  {fleetHealth}
                </p>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </motion.header>
  );
}

/** Eight radial threads from a hub — the mark is the product's own diagram. */
function SpinneretMark() {
  return (
    <svg width="26" height="26" viewBox="0 0 30 30" aria-hidden="true">
      {Array.from({ length: 8 }, (_, index) => {
        const angle = (index / 8) * Math.PI * 2;
        return (
          <line
            key={index}
            x1={15}
            y1={15}
            x2={15 + Math.cos(angle) * 13}
            y2={15 + Math.sin(angle) * 13}
            stroke="var(--silk)"
            strokeWidth="1"
            opacity={0.7}
          />
        );
      })}
      <circle cx="15" cy="15" r="9" fill="none" stroke="var(--silk)" strokeWidth="0.8" opacity="0.45" />
      <circle cx="15" cy="15" r="4.5" fill="none" stroke="var(--silk)" strokeWidth="0.8" opacity="0.75" />
      <circle cx="15" cy="15" r="2" fill="var(--silk)" />
    </svg>
  );
}
