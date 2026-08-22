"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { EventRecord } from "@/db/repositories";

/**
 * Live activity console.
 *
 * A heal takes minutes, and the operator needs to see that it is still moving.
 * The console is append-only and auto-scrolls, so it reads as a flight-recorder
 * transcript rather than a status widget that silently mutates.
 */

const LEVEL_STYLE: Record<string, { dot: string; tag: string; body: string }> = {
  ok: { dot: "bg-vital-good", tag: "text-vital-good", body: "text-ink" },
  info: { dot: "bg-ink-faint", tag: "text-ink-faint", body: "text-ink-muted" },
  warn: { dot: "bg-vital-warn", tag: "text-vital-warn", body: "text-ink" },
  heal: { dot: "bg-silk", tag: "text-silk", body: "text-ink" },
};

export function Console({ events }: { events: EventRecord[] }) {
  const endRef = useRef<HTMLDivElement>(null);
  const ordered = [...events].reverse();

  /**
   * Scroll the console's own viewport, never the document.
   *
   * `scrollIntoView` walks up to the nearest scrollable ancestor, which on this
   * page is the window — so it dragged the whole dashboard down past the hero on
   * first paint. Setting scrollTop on the viewport keeps the effect local.
   */
  useEffect(() => {
    const viewport = endRef.current?.closest<HTMLElement>(
      "[data-slot='scroll-area-viewport']",
    );
    if (!viewport) return;

    viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
  }, [events.length]);

  return (
    <Card className="flex h-full flex-col gap-0 overflow-hidden border-line bg-surface/70 p-0">
      <header className="flex shrink-0 items-center gap-2 border-b border-line px-4 py-3">
        <span className="size-1.5 animate-pulse rounded-full bg-vital-good" aria-hidden="true" />
        <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
          Sentinel Console
        </h3>
        <span className="tabular ml-auto font-mono text-[10px] text-ink-faint">
          {events.length} events
        </span>
      </header>

      <ScrollArea className="min-h-0 flex-1">
        <div className="px-4 py-3" aria-live="polite" aria-atomic="false">
          {ordered.length === 0 ? (
            <p className="font-mono text-[12px] text-ink-faint">
              Waiting for the first observation…
            </p>
          ) : (
            <ol className="space-y-2">
              <AnimatePresence initial={false}>
                {ordered.map((event) => {
                  const style = LEVEL_STYLE[event.level] ?? LEVEL_STYLE.info;
                  return (
                    <motion.li
                      key={event.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.28, ease: "easeOut" }}
                      className="flex gap-2.5 font-mono text-[11.5px] leading-[1.6]"
                    >
                      <span
                        className={`mt-[7px] size-1 shrink-0 rounded-full ${style.dot}`}
                        aria-hidden="true"
                      />
                      <time className="tabular shrink-0 text-ink-faint">
                        {new Date(event.at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </time>
                      <span className={`shrink-0 uppercase ${style.tag}`}>{event.level}</span>
                      <span className={`min-w-0 break-words ${style.body}`}>
                        {event.message}
                      </span>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ol>
          )}
          <div ref={endRef} />
        </div>
      </ScrollArea>
    </Card>
  );
}
