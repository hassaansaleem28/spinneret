"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { DocsSidebar } from "./DocsSidebar";

/**
 * Docs header.
 *
 * Deliberately not the dashboard navbar: there is no fleet to report on here, and
 * carrying a live health readout onto a static reference page would imply the
 * numbers relate to what you are reading.
 */
export function DocsHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-line/80 bg-void/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-4 px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <SpinneretMark />
          <span className="font-display text-[22px] leading-none tracking-tight text-ink">
            Spinneret
          </span>
        </Link>

        <Separator orientation="vertical" className="hidden h-5 sm:block" />
        <span className="hidden font-mono text-[10.5px] uppercase tracking-[0.2em] text-ink-faint sm:block">
          Docs
        </span>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />

          {/* A link styled as a button, rather than a Button rendering a link:
              Base UI expects a native <button> and warns otherwise, and this is
              navigation, so an anchor is the correct element anyway. */}
          <Link
            href="/"
            className={buttonVariants({ variant: "outline", size: "sm", className: "gap-1.5" })}
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>

          <Sheet>
            <SheetTrigger
              render={
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Open Documentation Menu"
                  className="size-8 lg:hidden"
                >
                  <Menu className="size-4" aria-hidden="true" />
                </Button>
              }
            />
            <SheetContent side="left" className="w-72 border-line bg-surface">
              <SheetHeader>
                <SheetTitle className="font-display text-2xl tracking-tight text-ink">
                  Contents
                </SheetTitle>
              </SheetHeader>
              <div className="overflow-y-auto px-3 pb-8">
                <DocsSidebar />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

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
