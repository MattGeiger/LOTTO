// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

"use client";

import * as React from "react";
import { LanguagesIcon } from "@/components/lucide-animated/languages";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAppHaptics } from "@/components/haptics-provider";
import { useLanguage, type Language } from "@/contexts/language-context";

export const LANGUAGE_SWITCHER_TRIGGER_ID = "language-switcher-trigger";

type LanguageSwitcherProps = {
  enableHaptics?: boolean;
  onLanguageChange?: (language: Language) => void;
};

export function LanguageSwitcher({ enableHaptics = false, onLanguageChange }: LanguageSwitcherProps) {
  const { language, setLanguage, availableLanguages, ensureAvailableLanguagesLoaded } = useLanguage();
  const { trigger } = useAppHaptics();

  // With more than 10 options (dynamic languages enabled), bound the menu and scroll.
  const needsScroll = availableLanguages.length > 10;

  return (
    // Load the dynamic language list when the picker opens (not on page mount),
    // so pages pay nothing until the visitor actually reaches for the menu.
    <DropdownMenu onOpenChange={(open) => open && ensureAvailableLanguagesLoaded()}>
      <DropdownMenuTrigger asChild>
        <Button
          id={LANGUAGE_SWITCHER_TRIGGER_ID}
          variant="outline"
          size="icon"
          className="!h-[3.375rem] !w-[3.375rem] [&_svg]:!size-[1.8rem]"
        >
          <LanguagesIcon size={28} className="inline-flex text-current" />
          <span className="sr-only">Change language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-popover/[45%] backdrop-blur-[6px]">
        {(() => {
          const radioGroup = (
            <DropdownMenuRadioGroup
              value={language}
              onValueChange={(val) => {
                if (val === language) {
                  return;
                }
                const nextLanguage = val as Language;
                setLanguage(nextLanguage);
                onLanguageChange?.(nextLanguage);
                if (enableHaptics) {
                  trigger("uiSelect");
                }
              }}
            >
              {availableLanguages.map((option) => (
                <DropdownMenuRadioItem key={option.code} value={option.code}>
                  {option.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          );
          return needsScroll ? (
            <ScrollArea className="h-[min(60vh,20rem)]">{radioGroup}</ScrollArea>
          ) : (
            radioGroup
          );
        })()}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
