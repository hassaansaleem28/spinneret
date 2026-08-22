"use client";

import { motion } from "framer-motion";

/**
 * Dependency direction, drawn.
 *
 * The rule this project is built on is that every arrow points inward: nothing
 * in the domain core may import a database, a network client or a React
 * component. A box diagram with arrows makes a violation visible at a glance in
 * a way a directory listing never does.
 */

interface Layer {
  name: string;
  path: string;
  role: string;
  mayImport: string;
  accent?: boolean;
}

const LAYERS: Layer[] = [
  {
    name: "Interface",
    path: "app/, components/",
    role: "Dashboard, docs, HTTP routes and the SSE feed",
    mayImport: "services, db, core",
  },
  {
    name: "Services",
    path: "services/",
    role: "Sentinel loop, scheduler, background jobs, read model",
    mayImport: "adapters, db, core",
  },
  {
    name: "Adapters & Storage",
    path: "adapters/, db/",
    role: "The only modules that spawn the CLI or write SQL",
    mayImport: "core",
  },
  {
    name: "Domain Core",
    path: "core/",
    role: "Health scoring, drift detection, prompt composition, signal rules",
    mayImport: "nothing",
    accent: true,
  },
];

export function ArchitectureDiagram() {
  return (
    <div className="rounded-xl border border-line bg-surface/60 p-6">
      <ul className="space-y-3">
        {LAYERS.map((layer, index) => (
          <motion.li
            key={layer.name}
            initial={{ opacity: 0, x: -14 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: index * 0.09, ease: [0.16, 1, 0.3, 1] }}
          >
            <div
              className={`rounded-lg border p-4 ${
                layer.accent
                  ? "border-silk/45 bg-silk/[0.07]"
                  : "border-line bg-surface-2"
              }`}
              style={{ marginLeft: `${index * 20}px` }}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h4
                  className={`text-[15px] font-semibold ${
                    layer.accent ? "text-silk" : "text-ink"
                  }`}
                >
                  {layer.name}
                </h4>
                <code
                  translate="no"
                  className="font-mono text-[11.5px] text-ink-faint"
                >
                  {layer.path}
                </code>
              </div>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-muted">
                {layer.role}
              </p>
              <p className="mt-2 font-mono text-[11px] text-ink-faint">
                may import: {layer.mayImport}
              </p>
            </div>

            {index < LAYERS.length - 1 && (
              <div
                className="flex items-center gap-2 py-1.5 pl-6"
                style={{ marginLeft: `${index * 20}px` }}
                aria-hidden="true"
              >
                <span className="font-mono text-[13px] text-ink-faint">↓</span>
                <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-faint">
                  depends on
                </span>
              </div>
            )}
          </motion.li>
        ))}
      </ul>

      <p className="mt-5 border-t border-line pt-4 text-[13.5px] leading-relaxed text-ink-muted">
        Every arrow points one way. That is what lets the self-healing decision
        logic run in a unit test with no database, no network and no Bright Data
        account, and it is why swapping SQLite for Postgres touches exactly one
        file.
      </p>
    </div>
  );
}
