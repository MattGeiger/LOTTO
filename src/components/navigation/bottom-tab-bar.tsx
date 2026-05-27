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

export function BottomTabBar() {
  const pathname = usePathname() ?? "";
  const { language, t } = useLanguage();
  const iconRefs = React.useRef<Record<string, NavIconHandle | null>>({});
  const reducedMotionRef = React.useRef(false);

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

  return (
    <nav
      aria-label={t("navPrimaryLabel")}
      dir={isRTL(language) ? "rtl" : "ltr"}
      className="fixed inset-x-0 bottom-0 z-40 flex justify-center sm:bottom-9 sm:px-4"
    >
      <ul
        className={cn(
          "flex w-full items-stretch gap-1 border-border bg-card/85 backdrop-blur-md",
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
                  <span className={cn("text-center text-xs leading-tight", active ? "font-semibold" : "font-medium")}>
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
