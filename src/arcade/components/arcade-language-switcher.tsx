// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

"use client";

import * as React from "react";

import { Button } from "@/arcade/ui/8bit";
import { useAppHaptics } from "@/components/haptics-provider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/contexts/language-context";
import { isRTL } from "@/lib/rtl-utils";

export function ArcadeLanguageSwitcher() {
  const {
    language,
    setLanguage,
    t,
    availableLanguages,
    ensureAvailableLanguagesLoaded,
  } = useLanguage();
  const { trigger } = useAppHaptics();
  const [open, setOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const isRtlLanguage = isRTL(language);
  const activeLabel =
    availableLanguages.find((option) => option.code === language)?.label ?? language;
  const needsScroll = availableLanguages.length > 10;

  // The Arcade picker is always present, so resolve the shared visitor catalog
  // before the menu opens. Waiting for a click showed the static core list for
  // the first open and made activated languages appear missing on iPad.
  React.useEffect(() => {
    ensureAvailableLanguagesLoaded();
  }, [ensureAvailableLanguagesLoaded]);

  React.useEffect(() => {
    if (!open) return;
    const onClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="arcade-ui px-2 text-sm"
        onClick={() => setOpen((previous) => !previous)}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        {activeLabel}
      </Button>

      {open ? (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-[10rem] border-2 border-[var(--arcade-wall)] bg-[var(--arcade-panel)] shadow-lg">
          {(() => {
            const options = (
              <ul role="listbox" aria-label={t("language")} className="p-1">
                {availableLanguages.map(({ code, label }) => (
                  <li key={code} role="option" aria-selected={code === language}>
                    <button
                      type="button"
                      className={`arcade-ui block w-full px-3 py-2 text-base transition-colors ${
                        code === language
                          ? "bg-[var(--arcade-wall)]/30 text-[var(--arcade-dot)]"
                          : "text-[var(--arcade-text)] hover:bg-[var(--arcade-wall)]/20 hover:text-[var(--arcade-dot)]"
                      } ${isRtlLanguage ? "text-right" : "text-left"}`}
                      onClick={() => {
                        if (code === language) {
                          setOpen(false);
                          return;
                        }
                        setLanguage(code);
                        trigger("uiSelect");
                        setOpen(false);
                      }}
                    >
                      {label}
                    </button>
                  </li>
                ))}
              </ul>
            );
            return needsScroll ? (
              <ScrollArea className="h-[min(60vh,20rem)]">{options}</ScrollArea>
            ) : (
              options
            );
          })()}
        </div>
      ) : null}
    </div>
  );
}
