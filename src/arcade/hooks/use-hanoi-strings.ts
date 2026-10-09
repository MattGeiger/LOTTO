"use client";
import { useLanguage } from "@/contexts/language-context";
import { HANOI_TRANSLATIONS, type HanoiStringKey } from "@/arcade/game/tower-of-hanoi/strings";
export function useHanoiStrings() {
  const { language, t } = useLanguage();
  return (key: HanoiStringKey) => HANOI_TRANSLATIONS[language]?.[key] ?? t(key);
}
