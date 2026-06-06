// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { navItems, type NavIconHandle } from "@/components/navigation/nav-items";
import { useLanguage } from "@/contexts/language-context";
import { isRTL } from "@/lib/rtl-utils";
import { cn } from "@/lib/utils";

// Module-level guard so the active-tab mount animation plays once per full page
// load — not on client-side navigation between destinations (per-page rendering
// remounts the bar on every navigation). Resets on hard refresh. The behavior
// is specified in docs/NAVIGATION.md ("active tab only, on mount").
let didPlayMountAnimation = false;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

type BottomTabBarProps = {
  /**
   * When set (used by the `/display` board), the bar hides after this many
   * seconds of inactivity and reappears on any user activity. Omit on every
   * other route to keep the bar permanently visible.
   */
  autoHideAfterSeconds?: number;
};

export function BottomTabBar({ autoHideAfterSeconds }: BottomTabBarProps = {}) {
  const pathname = usePathname() ?? "";
  const { language, t } = useLanguage();
  const textDirection = isRTL(language) ? "rtl" : "ltr";
  const iconRefs = React.useRef<Record<string, NavIconHandle | null>>({});
  const reducedMotionRef = React.useRef(false);

  const autoHideEnabled = typeof autoHideAfterSeconds === "number" && autoHideAfterSeconds > 0;
  const [isHidden, setIsHidden] = React.useState(false);

  // Active-tab-only, once-per-page-load mount animation.
  React.useEffect(() => {
    reducedMotionRef.current = prefersReducedMotion();
    if (reducedMotionRef.current || didPlayMountAnimation) return;
    const activeItem = navItems.find((item) => item.isActive(pathname));
    if (!activeItem) return;
    iconRefs.current[activeItem.id]?.startAnimation();
    didPlayMountAnimation = true;
    // Mount-only: intentionally not re-run on pathname change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Display-only auto-hide: start visible, hide after the inactivity window,
  // and restore on any user activity (which also restarts the timer). Listening
  // at the window level means the hidden bar can be pointer-events-none without
  // trapping the user — any tap/move/key brings it back. Re-runs when the
  // interval changes (e.g. admin edits the rotation cadence).
  React.useEffect(() => {
    if (!autoHideEnabled) {
      setIsHidden(false);
      return;
    }

    let timeoutId: number | undefined;
    const restart = () => {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => setIsHidden(true), autoHideAfterSeconds * 1000);
    };
    const handleActivity = () => {
      setIsHidden(false);
      restart();
    };

    const events: Array<keyof WindowEventMap> = ["pointerdown", "pointermove", "keydown", "touchstart"];
    for (const event of events) {
      window.addEventListener(event, handleActivity, { passive: true });
    }
    restart();

    return () => {
      window.clearTimeout(timeoutId);
      for (const event of events) {
        window.removeEventListener(event, handleActivity);
      }
    };
  }, [autoHideEnabled, autoHideAfterSeconds]);

  return (
    <nav
      aria-label={t("navPrimaryLabel")}
      dir="ltr"
      aria-hidden={isHidden || undefined}
      inert={isHidden || undefined}
      data-auto-hidden={isHidden ? "true" : undefined}
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 flex justify-center sm:bottom-6 sm:px-4",
        autoHideEnabled &&
          (reducedMotionRef.current ? "" : "transition-[opacity,transform] duration-300 ease-out"),
        isHidden && "pointer-events-none translate-y-full opacity-0 sm:translate-y-[calc(100%+1.5rem)]"
      )}
    >
      <ul
        className={cn(
          "flex w-full items-stretch gap-1 border-border bg-card/[45%] backdrop-blur-[6px]",
          "border-t px-2 pt-1 pb-[max(env(safe-area-inset-bottom),0.5rem)]",
          "sm:w-auto sm:rounded-full sm:border sm:p-2 sm:shadow-[var(--base-shadow-lg)]"
        )}
      >
        {navItems.map((item) => {
          const active = item.isActive(pathname);
          const Icon = item.icon;
          const animate = () => {
            if (reducedMotionRef.current) return;
            iconRefs.current[item.id]?.startAnimation();
          };
          const stop = () => {
            if (reducedMotionRef.current) return;
            iconRefs.current[item.id]?.stopAnimation();
          };

          return (
            <li key={item.id} className="flex flex-1 sm:flex-initial">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                onMouseEnter={animate}
                onMouseLeave={stop}
                onPointerDown={animate}
                className={cn(
                  "relative flex flex-1 flex-col items-center justify-start gap-1 rounded-2xl px-3 py-2 outline-none transition-colors",
                  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  "sm:min-w-[5.5rem] sm:px-5",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {active ? (
                  <span aria-hidden="true" className="absolute inset-0 rounded-2xl bg-primary/12" />
                ) : null}
                <span className="relative z-10 flex flex-col items-center gap-1">
                  <Icon
                    ref={(handle) => {
                      iconRefs.current[item.id] = handle;
                    }}
                    size={24}
                    className="inline-flex"
                  />
                  <span
                    dir={textDirection}
                    className={cn("text-center text-xs leading-tight", active ? "font-semibold" : "font-medium")}
                  >
                    {t(item.labelKey)}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
