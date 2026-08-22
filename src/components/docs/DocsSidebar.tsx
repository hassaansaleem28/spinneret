"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { DOC_GROUPS, DOC_SECTIONS } from "./sections";

/**
 * Docs navigation with scroll spy.
 *
 * IntersectionObserver rather than scroll maths: it reports which headings are
 * on screen without a listener firing on every frame, and a top-biased root
 * margin makes the highlight change as a section reaches reading position rather
 * than when it first peeks over the fold.
 */
export function DocsSidebar() {
  const [active, setActive] = useState(DOC_SECTIONS[0].id);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const onScreen = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (onScreen[0]) setActive(onScreen[0].target.id);
      },
      { rootMargin: "-88px 0px -65% 0px", threshold: 0 },
    );

    for (const section of DOC_SECTIONS) {
      const element = document.getElementById(section.id);
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <nav aria-label="Documentation" className="text-[13.5px]">
      {DOC_GROUPS.map((group) => (
        <div key={group} className="mb-6">
          <p className="mb-2 px-3 font-mono text-[9.5px] uppercase tracking-[0.18em] text-ink-faint">
            {group}
          </p>
          <ul className="space-y-0.5">
            {DOC_SECTIONS.filter((section) => section.group === group).map((section) => {
              const isActive = active === section.id;
              return (
                <li key={section.id} className="relative">
                  {isActive && (
                    <motion.span
                      layoutId="docs-active"
                      className="absolute inset-0 rounded-md bg-surface-2"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  )}
                  <a
                    href={`#${section.id}`}
                    aria-current={isActive ? "location" : undefined}
                    className={`relative block rounded-md px-3 py-1.5 transition-colors ${
                      isActive
                        ? "font-medium text-ink"
                        : "text-ink-muted hover:text-ink"
                    }`}
                  >
                    {section.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
