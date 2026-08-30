// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

"use client";

import * as React from "react";
import { useTheme } from "next-themes";

import { Moon } from "@/components/animate-ui/icons/moon";
import { Sun } from "@/components/animate-ui/icons/sun";
import {
  ThemeToggler,
  type ResolvedThemeSelection,
  type ThemeSelection,
} from "@/components/animate-ui/primitives/effects/theme-toggler";
import { useAppHaptics } from "@/components/haptics-provider";
import { EyeIcon } from "@/components/lucide-animated/eye";
import { useContrastMode } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function normalizeThemeSelection(theme: string | undefined): ThemeSelection {
  if (theme === "light" || theme === "dark" || theme === "system") {
    return theme;
  }
  return "system";
}

function normalizeResolvedTheme(
  theme: ThemeSelection,
  resolvedTheme: string | undefined,
): ResolvedThemeSelection {
  if (resolvedTheme === "light" || resolvedTheme === "dark") {
    return resolvedTheme;
  }
  if (theme === "light" || theme === "dark") {
    return theme;
  }
  return "light";
}

export const THEME_SWITCHER_TRIGGER_ID = "theme-switcher-trigger";

export function getThemeCycleTarget(
  mounted: boolean,
  hiVizEnabled: boolean,
  resolved: ResolvedThemeSelection,
): "light" | "dark" | "hi-viz" {
  // `next-themes` cannot know the system preference during SSR, but can know it
  // on the client's first render. Keep both sides on the same disabled target
  // until the mount effect runs; otherwise a dark system preference changes
  // the icon and accessible label during hydration.
  if (!mounted) return "dark";
  if (hiVizEnabled) return "light";
  return resolved === "light" ? "dark" : "hi-viz";
}

/**
 * One tap cycles the three appearances staff need on the floor:
 * Light → Dark → Hi-viz → Light. System remains an internal base state for
 * Hi-viz, not a fourth decision exposed by the header control.
 */
export function ThemeSwitcher({ enableHaptics = false }: { enableHaptics?: boolean }) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { contrastMode, setContrastMode } = useContrastMode();
  const { trigger } = useAppHaptics();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const selectedTheme = normalizeThemeSelection(theme);
  const activeResolvedTheme = normalizeResolvedTheme(selectedTheme, resolvedTheme);
  const hiVizEnabled = contrastMode === "hi-viz";

  return (
    <ThemeToggler
      theme={selectedTheme}
      resolvedTheme={activeResolvedTheme}
      setTheme={(nextTheme) => setTheme(nextTheme)}
      direction="ltr"
    >
      {({ resolved, toggleTheme }) => {
        const targetMode = getThemeCycleTarget(mounted, hiVizEnabled, resolved);
        const label =
          targetMode === "hi-viz"
            ? "Switch to high-visibility theme"
            : `Switch to ${targetMode} theme`;

        const cycleTheme = () => {
          if (targetMode === "hi-viz") {
            // Hi-viz remains a contrast layer over the device's light/dark
            // base; the header simply removes that data-model decision.
            setContrastMode("hi-viz");
            void toggleTheme("system");
          } else {
            setContrastMode("default");
            void toggleTheme(targetMode);
          }
          if (enableHaptics) trigger("uiToggle");
        };

        return (
          <TooltipProvider delayDuration={400}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  id={THEME_SWITCHER_TRIGGER_ID}
                  variant="outline"
                  size="icon"
                  onClick={cycleTheme}
                  disabled={!mounted}
                  aria-label={label}
                  className="!h-[3.375rem] !w-[3.375rem] [&_svg]:!size-[1.8rem]"
                >
                  {targetMode === "dark" ? (
                    <Moon
                      key="target-dark"
                      size={29}
                      animation="default"
                      animateOnView="default"
                      animateOnHover="default"
                      animateOnTap="default"
                      className="inline-flex text-current"
                    />
                  ) : targetMode === "hi-viz" ? (
                    <EyeIcon
                      key="target-hi-viz"
                      size={29}
                      className="inline-flex text-current"
                      animateOnView
                      animateOnHover
                      animateOnTap
                    />
                  ) : (
                    <Sun
                      key="target-light"
                      size={29}
                      animation="default"
                      animateOnView="default"
                      animateOnHover="default"
                      animateOnTap="default"
                      className="inline-flex text-current"
                    />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{label}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      }}
    </ThemeToggler>
  );
}
