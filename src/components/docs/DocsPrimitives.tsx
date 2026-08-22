"use client";

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";

/**
 * Shared building blocks for the documentation.
 *
 * Sections reveal on scroll rather than all at once, which keeps a long
 * technical page feeling paced instead of dumped.
 */

export function DocSection({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string;
  eyebrow?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="scroll-mt-24 border-t border-line pt-12 first:border-t-0 first:pt-0"
    >
      {eyebrow && (
        <div className="mb-3 flex items-center gap-3">
          <span className="h-px w-6 bg-silk" aria-hidden="true" />
          <span className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-silk">
            {eyebrow}
          </span>
        </div>
      )}
      <h2 className="font-display text-[34px] leading-[1.1] tracking-tight text-ink">
        {title}
      </h2>
      <div className="mt-5 space-y-4">{children}</div>
    </motion.section>
  );
}

/** Body copy at a comfortable measure. */
export function P({ children }: { children: React.ReactNode }) {
  return (
    <p className="max-w-[68ch] text-[15px] leading-[1.75] text-ink-muted">{children}</p>
  );
}

export function H3({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="pt-4 text-[17px] font-semibold tracking-tight text-ink">{children}</h3>
  );
}

/** Inline identifier. `translate="no"` keeps machine translation off code. */
export function Code({ children }: { children: React.ReactNode }) {
  return (
    <code
      translate="no"
      className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[12.5px] text-ink"
    >
      {children}
    </code>
  );
}

export function CodeBlock({ children, label }: { children: string; label?: string }) {
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-surface-2">
      {label && (
        <div className="border-b border-line px-4 py-2 font-mono text-[9.5px] uppercase tracking-[0.18em] text-ink-faint">
          {label}
        </div>
      )}
      <pre className="overflow-x-auto p-4">
        <code translate="no" className="font-mono text-[12.5px] leading-[1.75] text-ink-muted">
          {children}
        </code>
      </pre>
    </div>
  );
}

/** A callout for the reasoning behind a decision. */
export function Note({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="max-w-[68ch] rounded-lg border border-silk/25 bg-silk/[0.06] p-4">
      <p className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-silk">
        {title}
      </p>
      <div className="mt-2 text-[14px] leading-[1.7] text-ink-muted">{children}</div>
    </div>
  );
}

export function Pill({ children }: { children: React.ReactNode }) {
  return (
    <Badge
      variant="outline"
      className="border-line-bright font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint"
    >
      {children}
    </Badge>
  );
}
