"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Light/dark switch.
 *
 * Both icons are rendered and CSS picks the visible one from the `dark` class on
 * the root. The usual alternative is a `mounted` flag toggled in an effect, but
 * that trips the set-state-in-effect rule and still costs a re-render on every
 * page; letting the class that already exists do the work is simpler and has no
 * hydration mismatch to guard against.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle Light and Dark Mode"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="size-8 text-ink-muted hover:text-ink"
          >
            <Sun className="size-4 dark:hidden" aria-hidden="true" />
            <Moon className="hidden size-4 dark:block" aria-hidden="true" />
          </Button>
        }
      />
      <TooltipContent>Toggle Light and Dark Mode</TooltipContent>
    </Tooltip>
  );
}
