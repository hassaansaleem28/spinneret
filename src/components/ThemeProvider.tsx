"use client";

import { ThemeProvider as NextThemeProvider } from "next-themes";

/**
 * Theme plumbing.
 *
 * next-themes writes the class before first paint via an inline script, which is
 * what stops the dark palette flashing white on load. `disableTransitionOnChange`
 * suppresses the transition storm that would otherwise fire on every themed
 * property when the class flips.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemeProvider>
  );
}
