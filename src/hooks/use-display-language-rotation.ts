"use client";

import * as React from "react";

import { useLanguage } from "@/contexts/language-context";
import type { DisplayLanguageRotation } from "@/lib/state-types";

/**
 * Drives the large-format `/display` board through an admin-configured set of
 * languages on a timed interval (each shown for `intervalSeconds`). Mounted only
 * on the public board (`PublicDisplayPage`) so it never affects the personalized
 * homepage at `/`. It calls `setLanguage` from the surrounding non-persisting
 * `LanguageProvider`, so rotation never writes the shared `display-language`
 * preference. Each language change automatically triggers the board's existing
 * scramble transition and RTL direction flip.
 *
 * Rotation is intentionally independent of `prefers-reduced-motion` — showing a
 * client their own language is content/accessibility, not decoration. Only the
 * scramble transition (governed elsewhere) is motion.
 */
export function useDisplayLanguageRotation(config: DisplayLanguageRotation | null) {
  const { setLanguage } = useLanguage();

  const enabled = config?.enabled ?? false;
  const languages = React.useMemo(() => config?.languages ?? [], [config?.languages]);
  const intervalSeconds = config?.intervalSeconds ?? 0;

  // Stable signature so the timer only (re)starts when the config actually
  // changes — not on every poll, which hands back a fresh object each time.
  const signature = `${enabled}|${languages.join(",")}|${intervalSeconds}`;

  React.useEffect(() => {
    if (!enabled || languages.length === 0) return;

    let index = 0;
    // Start the cycle at the first selected language immediately.
    setLanguage(languages[0]);

    // A single language is a static pick (no interval needed).
    if (languages.length === 1 || intervalSeconds <= 0) return;

    const id = window.setInterval(() => {
      index = (index + 1) % languages.length;
      setLanguage(languages[index]);
    }, intervalSeconds * 1000);

    return () => window.clearInterval(id);
    // `signature` encodes enabled/languages/intervalSeconds; `setLanguage` is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, setLanguage]);
}
