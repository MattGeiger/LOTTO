// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

"use client";

import * as React from "react";
import Link from "next/link";

import { CircleHelpIcon, type CircleHelpIconHandle } from "@/components/lucide-animated/circle-help";
import { Button } from "@/components/ui/button";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * "Help" button linking to /help, with the project's standard animated-icon
 * rules: the icon animates once on page load, on parent-button hover, and on
 * click/tap (all guarded by `prefers-reduced-motion`).
 */
export function HelpNavButton() {
  const iconRef = React.useRef<CircleHelpIconHandle>(null);
  const reducedMotionRef = React.useRef(false);

  React.useEffect(() => {
    reducedMotionRef.current = prefersReducedMotion();
    if (reducedMotionRef.current) return;
    iconRef.current?.startAnimation();
  }, []);

  const animate = () => {
    if (reducedMotionRef.current) return;
    iconRef.current?.startAnimation();
  };
  const stop = () => {
    if (reducedMotionRef.current) return;
    iconRef.current?.stopAnimation();
  };

  return (
    <Button asChild variant="outline" size="sm">
      <Link href="/help" onMouseEnter={animate} onMouseLeave={stop} onPointerDown={animate}>
        <CircleHelpIcon ref={iconRef} size={16} className="mr-2 inline-flex" />
        Help
      </Link>
    </Button>
  );
}
