import type { Metadata, Viewport } from "next";
import { Archivo, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

/**
 * A deliberate three-font pairing rather than a default stack.
 *
 * Instrument Serif carries display and headline weight — an editorial serif in a
 * telemetry console is the unexpected choice that makes the product memorable.
 * Archivo handles interface text: a grotesque that stays legible at 12px. And
 * JetBrains Mono carries anything measured, so numbers and identifiers never
 * shift width as they update.
 */
const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  display: "swap",
});

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Spinneret · Scrapers That Fix Themselves",
  description:
    "Spinneret watches niche public sources for the moment a company starts buying, and repairs its own scrapers when those sources change shape.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f5f0" },
    { media: "(prefers-color-scheme: dark)", color: "#06070a" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${instrumentSerif.variable} ${archivo.variable} ${jetbrainsMono.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="min-h-full antialiased">
        {/* Keyboard users must be able to jump the navbar. */}
        <a
          href="#fleet"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-silk focus:px-4 focus:py-2 focus:font-medium focus:text-primary-foreground"
        >
          Skip to Content
        </a>
        <ThemeProvider>
          <div className="weave-backdrop" aria-hidden="true" />
          <TooltipProvider delay={200}>{children}</TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
