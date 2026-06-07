// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

// File-backed enabled-language store for local development (mirrors the
// file/db split in `state-manager.ts`). Production uses the Neon backend in
// `languages-store-db.ts`; this keeps the Language Settings tab working when
// `STATE_STORAGE=file` and no database is reachable.

import fs from "node:fs/promises";
import path from "node:path";

import { ALWAYS_ON_LANGUAGE_NAMES, LANGUAGE_CATALOG } from "@/lib/languages";
import type { LanguageRow } from "./languages-store-db";

export type { LanguageRow } from "./languages-store-db";

const ALWAYS_ON = new Set<string>(ALWAYS_ON_LANGUAGE_NAMES);
const VALID = new Set(LANGUAGE_CATALOG.map((entry) => entry.name));
const SORT_ORDER = new Map(LANGUAGE_CATALOG.map((entry, index) => [entry.name, index]));

const filePath = () => path.join(process.cwd(), "data", "languages.json");

const defaults = (): Record<string, boolean> =>
  Object.fromEntries(LANGUAGE_CATALOG.map((entry) => [entry.name, ALWAYS_ON.has(entry.name)]));

const readEnabledMap = async (): Promise<Record<string, boolean>> => {
  try {
    const raw = await fs.readFile(filePath(), "utf8");
    const parsed = JSON.parse(raw) as Record<string, boolean>;
    // Merge with defaults so newly-added catalog languages appear.
    return { ...defaults(), ...parsed };
  } catch {
    return defaults();
  }
};

const writeEnabledMap = async (map: Record<string, boolean>): Promise<void> => {
  const dir = path.dirname(filePath());
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(filePath(), JSON.stringify(map, null, 2), "utf8");
};

const toRows = (map: Record<string, boolean>): LanguageRow[] =>
  LANGUAGE_CATALOG.map((entry) => ({
    name: entry.name,
    isEnabled: ALWAYS_ON.has(entry.name) || Boolean(map[entry.name]),
    sortOrder: SORT_ORDER.get(entry.name) ?? 0,
  }));

export const seedLanguagesIfEmpty = async (): Promise<void> => {
  try {
    await fs.access(filePath());
  } catch {
    await writeEnabledMap(defaults());
  }
};

export const listLanguages = async (): Promise<LanguageRow[]> => {
  return toRows(await readEnabledMap());
};

export const listEnabledLanguages = async (): Promise<LanguageRow[]> => {
  return (await listLanguages()).filter((row) => row.isEnabled);
};

export const bulkSetEnabled = async (
  updates: ReadonlyArray<{ name: string; isEnabled: boolean }>,
): Promise<LanguageRow[]> => {
  const map = await readEnabledMap();
  for (const update of updates) {
    if (!VALID.has(update.name)) continue;
    map[update.name] = ALWAYS_ON.has(update.name) ? true : update.isEnabled;
  }
  await writeEnabledMap(map);
  return toRows(map);
};
