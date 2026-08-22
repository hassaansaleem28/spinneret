"use client";

import { useEffect, useRef } from "react";
import type { EventRecord } from "@/db/repositories";

/**
 * Live activity console.
 *
 * A heal takes minutes and the operator needs to see it is still moving. The
 * console is append-only and auto-scrolls, so it reads as a flight recorder
 * transcript rather than a status widget that silently mutates.
 */

const LEVEL_STYLE: Record<string, { dot: string; text: string; tag: string }> = {
  ok:   { dot: "bg-vital-good", text: "text-ink",        tag: "text-vital-good" },
  info: { dot: "bg-ink-faint",  text: "text-ink-muted",  tag: "text-ink-faint" },
  warn: { dot: "bg-vital-warn", text: "text-ink",        tag: "text-vital-warn" },
  heal: { dot: "bg-silk",       text: "text-ink",        tag: "text-silk" },
};

export function Console({ events }: { events: EventRecord[] }) {
  const endRef = useRef<HTMLDivElement>(null);
  const ordered = [...events].reverse();

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [events.length]);

  return (
    <div className="flex h-full flex-col rounded-xl border border-line bg-surface/80">
      <header className="flex items-center gap-2 border-b border-line px-4 py-3">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-vital-good" />
        <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-muted">
          sentinel console
        </h2>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {ordered.length === 0 ? (
          <p className="font-mono text-[12px] text-ink-faint">
            awaiting first observation…
          </p>
        ) : (
          <ol className="space-y-2">
            {ordered.map((event) => {
              const style = LEVEL_STYLE[event.level] ?? LEVEL_STYLE.info;
              return (
                <li key={event.id} className="flex gap-2.5 font-mono text-[11.5px] leading-relaxed">
                  <span className={`mt-1.5 h-1 w-1 shrink-0 rounded-full ${style.dot}`} />
                  <span className="shrink-0 text-ink-faint">
                    {new Date(event.at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </span>
                  <span className={`shrink-0 uppercase ${style.tag}`}>{event.level}</span>
                  <span className={`min-w-0 break-words ${style.text}`}>{event.message}</span>
                </li>
              );
            })}
          </ol>
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}
