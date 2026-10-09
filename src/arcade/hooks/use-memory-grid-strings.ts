"use client";
import { useLanguage } from "@/contexts/language-context";
import { MEMORY_GRID_TRANSLATIONS, type MemoryStringKey } from "@/arcade/game/memory-grid/strings";

export function useMemoryGridStrings() {
  const { language, t } = useLanguage();
  return (key: MemoryStringKey) => MEMORY_GRID_TRANSLATIONS[language]?.[key] ?? t(key);
}
