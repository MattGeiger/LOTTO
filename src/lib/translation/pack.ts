// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

// Client language packs (Feature 4 bridge). A pack maps UI-string keys to
// completed DB translations for one language, plus the translated active
// announcement. Visibility rule: the eight core languages are always client-
// visible (hand-authored translations); a newly enabled catalog language only
// becomes visible once every UI string has a completed translation.

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
  /** Translated active announcement markdown, when one exists. */
  announcement: string | null;
};

export type ClientLanguageOption = {
  code: string;
  label: string;
  name: string;
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

  let announcement: string | null = null;
  const state = await stateManager.loadState();
  const active = state.announcement;
  if (active?.enabled && active.markdown?.trim()) {
    const row = completed.find(
      (r) => r.type === "announcement" && r.originalText === active.markdown,
    );
    announcement = row?.translatedText ?? null;
  }

  return { code: entry.code, name: entry.name, uiStrings, announcement };
};

// A non-core language is client-ready when every distinct UI source string has a
// completed translation row ("mark language active when complete").
export const isLanguageReady = async (name: string): Promise<boolean> => {
  if (CORE_NAMES.has(name)) return true;
  const sources = distinctUiSources();
  const completed = await store.list({ language: name, type: "ui_string", status: "completed" });
  const done = new Set(completed.map((row) => row.originalText));
  for (const source of sources) {
    if (!done.has(source)) return false;
  }
  return true;
};

// Languages shown to visitors: the core eight (canonical order) plus enabled
// catalog languages whose translation packs are complete.
export const listClientLanguages = async (): Promise<ClientLanguageOption[]> => {
  const options: ClientLanguageOption[] = LANGUAGE_OPTIONS.map((option) => {
    const entry = getCatalogEntryByCode(option.code);
    return { code: option.code, label: option.label, name: entry?.name ?? option.label };
  });

  const enabled = await listEnabledLanguages();
  for (const row of enabled) {
    if (CORE_NAMES.has(row.name) || row.name === "English") continue;
    const entry = getCatalogEntryByName(row.name);
    if (!entry) continue;
    if (await isLanguageReady(row.name)) {
      options.push({ code: entry.code, label: entry.label, name: entry.name });
    }
  }
  return options;
};
