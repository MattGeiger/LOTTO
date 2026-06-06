// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

"use client";

import * as React from "react";

import { useLanguage } from "@/contexts/language-context";
import type { DisplayLanguageRotation } from "@/lib/state-types";

/**
 * Drives the large-format `/display` board through an admin-configured set of
 * languages on a timed interval (each shown for `intervalSeconds`). Mounted only
 * on the public board (`PublicDisplayPage`) so it never affects the personalized
 * homepage at `/`. It calls `setLanguage` from the surrounding non-persisting
 * `LanguageProvider`, using its transient setter so rotation never writes the
 * shared `display-language` preference or the session language override. Each
 * language change automatically triggers the board's existing scramble
 * transition and RTL direction flip.
 *
 * Rotation is intentionally independent of `prefers-reduced-motion` — showing a
 * client their own language is content/accessibility, not decoration. Only the
 * scramble transition (governed elsewhere) is motion.
 */
type DisplayLanguageRotationOptions = {
  /** Session-local manual override: stop rotation without resetting language. */
  paused?: boolean;
};

export function useDisplayLanguageRotation(
  config: DisplayLanguageRotation | null,
  { paused = false }: DisplayLanguageRotationOptions = {},
) {
  const { setTransientLanguage } = useLanguage();

  const enabled = config?.enabled ?? false;
  const languages = React.useMemo(() => config?.languages ?? [], [config?.languages]);
  const intervalSeconds = config?.intervalSeconds ?? 0;

  // Stable signature so the timer only (re)starts when the config actually
  // changes — not on every poll, which hands back a fresh object each time.
  const signature = `${paused}|${enabled}|${languages.join(",")}|${intervalSeconds}`;

  React.useEffect(() => {
    if (paused) return;

    if (!enabled || languages.length === 0) {
      setTransientLanguage("en");
      return;
    }

    let index = 0;
    // Start the cycle at the first selected language immediately.
    setTransientLanguage(languages[0]);

    // A single language is a static pick (no interval needed).
    if (languages.length === 1 || intervalSeconds <= 0) return;

    const id = window.setInterval(() => {
      index = (index + 1) % languages.length;
      setTransientLanguage(languages[index]);
    }, intervalSeconds * 1000);

    return () => window.clearInterval(id);
    // `signature` encodes enabled/languages/intervalSeconds; `setTransientLanguage` is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, setTransientLanguage]);
}
