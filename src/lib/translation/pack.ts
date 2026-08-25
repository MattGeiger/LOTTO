// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

// Client language packs (Feature 4 bridge). A pack maps UI-string keys to
// completed DB translations for one language, plus translated active brand copy
// and announcement. Visibility rule: the eight core languages are always
// client-visible (hand-authored translations); a newly enabled catalog language
// is ready once every UI string and active brand string has a completed row.

import { getResolvedBrand } from "@/lib/brand-config/resolve";
import {
  ALWAYS_ON_LANGUAGE_NAMES,
  getCatalogEntryByCode,
  getCatalogEntryByName,
  LANGUAGE_OPTIONS,
} from "@/lib/languages";
import { stateManager } from "@/lib/state-manager";
import { UI_STRINGS_EN } from "@/lib/ui-strings";
import { listEnabledLanguages } from "./languages-store";
import * as store from "./translations-store";

export type LanguagePack = {
  /** BCP-47 code, e.g. "bs". */
  code: string;
  /** English catalog name, e.g. "Bosnian" (the translation-store key). */
  name: string;
  /** UI-string key → translated text (completed rows only). */
  uiStrings: Record<string, string>;
  /** English inventory name → translated text (completed rows only). */
  inventory: Record<string, string>;
  /** Active visitor-facing brand source → translated text. */
  brandStrings: Record<string, string>;
  /** Translated active announcement markdown, when one exists. */
  announcement: string | null;
};

export type ClientLanguageOption = {
  code: string;
  label: string;
  name: string;
  /** True once required UI and active brand strings are translated (core = always). */
  ready: boolean;
};

const CORE_NAMES = new Set<string>(ALWAYS_ON_LANGUAGE_NAMES);

// Distinct English source strings (multiple keys can share one source text).
const distinctUiSources = (): Set<string> => {
  const set = new Set<string>();
  for (const value of Object.values(UI_STRINGS_EN)) {
    if (value?.trim()) set.add(value);
  }
  return set;
};

const activeBrandSources = async (): Promise<Set<string>> => {
  const brand = await getResolvedBrand();
  const sources = new Set<string>();
  const serviceLabel = brand.serviceLabel?.trim();
  if (serviceLabel) sources.add(serviceLabel);
  return sources;
};

export const buildLanguagePack = async (code: string): Promise<LanguagePack | null> => {
  const entry = getCatalogEntryByCode(code);
  if (!entry) return null;

  const completed = await store.list({ language: entry.name, status: "completed" });
  const byOriginal = new Map(
    completed.filter((row) => row.type === "ui_string").map((row) => [row.originalText, row]),
  );

  const uiStrings: Record<string, string> = {};
  for (const [key, english] of Object.entries(UI_STRINGS_EN)) {
    const row = byOriginal.get(english);
    if (row?.translatedText) uiStrings[key] = row.translatedText;
  }

  const brandSources = await activeBrandSources();
  const brandStrings: Record<string, string> = {};
  for (const row of completed) {
    if (
      row.type === "brand_string" &&
      row.translatedText &&
      brandSources.has(row.originalText)
    ) {
      brandStrings[row.originalText] = row.translatedText;
    }
  }

  // Inventory: keyed by the English name so the inventory page can look up a
  // translation when FEED has none for this language.
  const inventory: Record<string, string> = {};
  for (const row of completed) {
    if (row.type === "inventory" && row.translatedText) {
      inventory[row.originalText] = row.translatedText;
    }
  }

  let announcement: string | null = null;
  const state = await stateManager.loadState();
  const active = state.announcement;
  if (active?.enabled && active.markdown?.trim()) {
    const row = completed.find(
      (r) => r.type === "announcement" && r.originalText === active.markdown,
    );
    announcement = row?.translatedText ?? null;
  }

  return {
    code: entry.code,
    name: entry.name,
    uiStrings,
    inventory,
    brandStrings,
    announcement,
  };
};

// A non-core language is client-ready when every distinct UI source and active
// visitor-facing brand string has a completed translation row.
export const isLanguageReady = async (name: string): Promise<boolean> => {
  if (CORE_NAMES.has(name)) return true;
  const uiSources = distinctUiSources();
  const brandSources = await activeBrandSources();
  const completed = await store.list({ language: name, status: "completed" });
  const doneUi = new Set(
    completed.filter((row) => row.type === "ui_string").map((row) => row.originalText),
  );
  const doneBrand = new Set(
    completed.filter((row) => row.type === "brand_string").map((row) => row.originalText),
  );
  for (const source of uiSources) {
    if (!doneUi.has(source)) return false;
  }
  for (const source of brandSources) {
    if (!doneBrand.has(source)) return false;
  }
  return true;
};

// Languages offered to visitors: the core eight plus enabled dynamic languages
// whose required translations are complete. Preparation belongs to the Admin
// enablement flow; visitors never receive or poll incomplete options.
//
// Readiness for all enabled languages is computed from a SINGLE query of
// completed rows (grouped by language and type in memory) rather than one query
// per language — the per-language version made the homepage language list slow.
export const listClientLanguages = async (): Promise<ClientLanguageOption[]> => {
  const options: ClientLanguageOption[] = LANGUAGE_OPTIONS.map((option) => {
    const entry = getCatalogEntryByCode(option.code);
    return { code: option.code, label: option.label, name: entry?.name ?? option.label, ready: true };
  });

  const enabled = await listEnabledLanguages();
  const dynamic = enabled.filter(
    (row) => !CORE_NAMES.has(row.name) && row.name !== "English",
  );
  if (dynamic.length === 0) return options;

  const uiSources = distinctUiSources();
  const brandSources = await activeBrandSources();
  // One query for every completed row across all languages.
  const completed = await store.list({ status: "completed" });
  const doneUiByLanguage = new Map<string, Set<string>>();
  const doneBrandByLanguage = new Map<string, Set<string>>();
  for (const row of completed) {
    if (row.type !== "ui_string" && row.type !== "brand_string") continue;
    const target = row.type === "ui_string" ? doneUiByLanguage : doneBrandByLanguage;
    let set = target.get(row.language);
    if (!set) {
      set = new Set<string>();
      target.set(row.language, set);
    }
    set.add(row.originalText);
  }
  const isReady = (name: string): boolean => {
    const doneUi = doneUiByLanguage.get(name);
    if (!doneUi) return false;
    for (const source of uiSources) {
      if (!doneUi.has(source)) return false;
    }
    const doneBrand = doneBrandByLanguage.get(name);
    for (const source of brandSources) {
      if (!doneBrand?.has(source)) return false;
    }
    return true;
  };

  for (const row of dynamic) {
    const entry = getCatalogEntryByName(row.name);
    if (!entry) continue;
    if (!isReady(row.name)) continue;
    options.push({ code: entry.code, label: entry.label, name: entry.name, ready: true });
  }
  return options;
};
