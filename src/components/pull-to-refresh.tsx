// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

"use client";

import * as React from "react";
import { RefreshCw } from "lucide-react";

import { useLanguage } from "@/contexts/language-context";

const REFRESH_THRESHOLD_PX = 72;
const MAX_PULL_PX = 112;

const shouldIgnorePullTarget = (target: EventTarget | null): boolean =>
  target instanceof Element &&
  Boolean(
    target.closest(
      "input, textarea, select, [role='slider'], [data-pull-to-refresh-ignore]",
    ),
  );

type NavigatorWithStandalone = Navigator & { standalone?: boolean };

export const isInstalledAppMode = (): boolean =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (window.navigator as NavigatorWithStandalone).standalone === true;

const reloadPage = () => window.location.reload();

export function PullToRefresh({ onRefresh = reloadPage }: { onRefresh?: () => void }) {
  const { t } = useLanguage();
  const [enabled, setEnabled] = React.useState(false);
  const [pullDistance, setPullDistance] = React.useState(0);
  const [refreshing, setRefreshing] = React.useState(false);
  const startYRef = React.useRef<number | null>(null);
  const pullDistanceRef = React.useRef(0);

  React.useEffect(() => {
    const standalone = isInstalledAppMode();
    setEnabled(standalone);
    if (!standalone) return;

    document.documentElement.dataset.appMode = "standalone";

    const resetPull = () => {
      startYRef.current = null;
      pullDistanceRef.current = 0;
      setPullDistance(0);
    };

    const onTouchStart = (event: TouchEvent) => {
      if (
        refreshing ||
        event.touches.length !== 1 ||
        window.scrollY > 0 ||
        shouldIgnorePullTarget(event.target)
      ) {
        resetPull();
        return;
      }
      startYRef.current = event.touches[0].clientY;
    };

    const onTouchMove = (event: TouchEvent) => {
      if (startYRef.current === null || event.touches.length !== 1) return;
      if (window.scrollY > 0) {
        resetPull();
        return;
      }

      const delta = event.touches[0].clientY - startYRef.current;
      if (delta <= 0) {
        pullDistanceRef.current = 0;
        setPullDistance(0);
        return;
      }

      event.preventDefault();
      const resistedDistance = Math.min(MAX_PULL_PX, delta * 0.5);
      pullDistanceRef.current = resistedDistance;
      setPullDistance(resistedDistance);
    };

    const onTouchEnd = () => {
      const shouldRefresh = pullDistanceRef.current >= REFRESH_THRESHOLD_PX;
      resetPull();
      if (!shouldRefresh) return;
      setRefreshing(true);
      onRefresh();
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", resetPull, { passive: true });

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", resetPull);
      delete document.documentElement.dataset.appMode;
    };
  }, [onRefresh, refreshing]);

  if (!enabled || (pullDistance === 0 && !refreshing)) return null;

  const ready = pullDistance >= REFRESH_THRESHOLD_PX;
  const visibleDistance = refreshing ? REFRESH_THRESHOLD_PX : pullDistance;

  return (
    <div
      className="pointer-events-none fixed left-1/2 z-[100] flex size-11 items-center justify-center rounded-full border border-primary bg-card text-primary shadow-md"
      style={{
        top: "env(safe-area-inset-top, 0px)",
        transform: `translate(-50%, calc(-100% + ${visibleDistance}px))`,
        opacity: Math.min(1, visibleDistance / 36),
      }}
      role={refreshing ? "status" : undefined}
      aria-label={refreshing ? t("refreshing") : undefined}
      aria-hidden={refreshing ? undefined : true}
      data-ready={ready || refreshing ? "true" : "false"}
      data-testid="pull-to-refresh-indicator"
    >
      <RefreshCw
        aria-hidden="true"
        className={`size-5 ${refreshing ? "animate-spin" : ""}`}
        style={{ transform: refreshing ? undefined : `rotate(${pullDistance * 3}deg)` }}
      />
    </div>
  );
}
