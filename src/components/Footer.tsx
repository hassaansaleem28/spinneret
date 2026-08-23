import Link from "next/link";
import { Heart } from "lucide-react";
import { Separator } from "@/components/ui/separator";

/**
 * Site footer.
 *
 * Carries the three things a reader of this project actually needs: where the
 * code is, what the live Collector IDs are, and the data-ethics position. The
 * Collector IDs are here rather than buried in the docs because they are the
 * verifiable proof that the scrapers are real.
 */

const COLLECTORS = [
  { slug: "hiring-signals", id: "c_mt4dzl5v15c84o86sa" },
  { slug: "funded-startups", id: "c_mt4e1as4160iqj53as" },
  { slug: "product-velocity", id: "c_mt4fj43j1tvgzr9bs2" },
];

export function Footer() {
  return (
    <footer className="relative z-10 mt-24 border-t border-line bg-surface/40">
      <div className="mx-auto grid max-w-[1440px] gap-10 px-6 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2.5">
            <SpinneretMark />
            <span className="font-display text-[22px] leading-none tracking-tight text-ink">
              Spinneret
            </span>
          </div>
          <p className="mt-3.5 max-w-[42ch] text-[13.5px] leading-[1.7] text-ink-muted">
            A buying-signal radar whose scrapers diagnose and repair themselves.
            Built for Into the Scrape-Verse, the Bright Data and WeMakeDevs
            hackathon.
          </p>
          <p className="mt-4 max-w-[42ch] text-[12.5px] leading-[1.7] text-ink-faint">
            Public sources only. Signals are company level, derived from public
            job postings, directory listings and published changelogs. No
            personal data is collected, stored or scored.
          </p>
        </div>

        <nav aria-label="Footer">
          <h2 className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-ink-faint">
            Explore
          </h2>
          <ul className="mt-3.5 space-y-2 text-[13.5px]">
            {[
              { href: "/#fleet", label: "Collector Fleet" },
              { href: "/#lab", label: "Contract Lab" },
              { href: "/#signals", label: "Buying Signals" },
              { href: "/#ledger", label: "Heal Ledger" },
              { href: "/docs", label: "Documentation" },
            ].map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-ink-muted transition-colors hover:text-ink"
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <a
                href="https://github.com/hassaansaleem28/spinneret"
                target="_blank"
                rel="noopener noreferrer"
                className="text-ink-muted transition-colors hover:text-ink"
              >
                Source on GitHub ↗
              </a>
            </li>
          </ul>
        </nav>

        <div>
          <h2 className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-ink-faint">
            Live Collector IDs
          </h2>
          <ul className="mt-3.5 space-y-2.5">
            {COLLECTORS.map((collector) => (
              <li key={collector.id}>
                <p className="font-mono text-[12px] text-ink-muted">
                  {collector.slug}
                </p>
                <code
                  translate="no"
                  className="font-mono text-[11.5px] text-silk"
                >
                  {collector.id}
                </code>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <Separator />

      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-6 py-6">
        <p className="flex items-center gap-1.5 font-mono text-[11.5px] text-ink-faint">
          Built with Bright Data Scraper Studio, by Hassaan with
          {/* An SVG rather than an emoji: emoji render at the mercy of the
              platform font and cannot inherit the palette. */}
          <Heart
            className="size-3 shrink-0 text-silk"
            fill="currentColor"
            aria-label="love"
          />
        </p>
        <p className="font-mono text-[11.5px] text-ink-faint">
          Next.js · TypeScript · SQLite · shadcn/ui
        </p>
      </div>
    </footer>
  );
}

function SpinneretMark() {
  return (
    <svg width="24" height="24" viewBox="0 0 30 30" aria-hidden="true">
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
      <circle
        cx="15"
        cy="15"
        r="9"
        fill="none"
        stroke="var(--silk)"
        strokeWidth="0.8"
        opacity="0.45"
      />
      <circle
        cx="15"
        cy="15"
        r="4.5"
        fill="none"
        stroke="var(--silk)"
        strokeWidth="0.8"
        opacity="0.75"
      />
      <circle cx="15" cy="15" r="2" fill="var(--silk)" />
    </svg>
  );
}
