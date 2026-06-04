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
import { useAppHaptics } from "@/components/haptics-provider";
import { useLanguage, type Language } from "@/contexts/language-context";

const languageNames: Record<Language, string> = {
  en: "English",
  zh: "中文",
  es: "Español",
  ru: "Русский",
  uk: "Українська",
  vi: "Tiếng Việt",
  fa: "فارسی",
  ar: "العربية",
};

export const LANGUAGE_SWITCHER_TRIGGER_ID = "language-switcher-trigger";

type LanguageSwitcherProps = {
  enableHaptics?: boolean;
  onLanguageChange?: (language: Language) => void;
};

export function LanguageSwitcher({ enableHaptics = false, onLanguageChange }: LanguageSwitcherProps) {
  const { language, setLanguage } = useLanguage();
  const { trigger } = useAppHaptics();

  return (
    <DropdownMenu>
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
          {Object.entries(languageNames).map(([code, name]) => (
            <DropdownMenuRadioItem key={code} value={code}>
              {name}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
