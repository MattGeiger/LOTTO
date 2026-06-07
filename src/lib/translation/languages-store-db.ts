// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

// Neon-backed store for the enabled-language catalog (Feature 3, increment 1).
// Mirrors FEED's `Language` model + `routes/languages.ts` behavior. Keyed by
// English name (matches `translations.language`). The eight hardcoded base
// languages are always enabled and cannot be turned off.

import { neon } from "@neondatabase/serverless";

import { ALWAYS_ON_LANGUAGE_NAMES, LANGUAGE_CATALOG } from "@/lib/languages";

export type LanguageRow = {
  name: string;
  isEnabled: boolean;
  sortOrder: number;
};

type SqlClient = ReturnType<typeof neon>;

const getSql = (databaseUrl = process.env.DATABASE_URL): SqlClient => {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to use the languages store.");
  }
  return neon(databaseUrl);
};

const withTimeout = async <T>(promise: Promise<T>): Promise<T> => {
  const timeoutMs = Number(process.env.DATABASE_TIMEOUT_MS ?? "5000");
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`Database request timed out after ${timeoutMs}ms.`)),
      timeoutMs,
    );
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer) clearTimeout(timer);
  });
};

const ALWAYS_ON = new Set<string>(ALWAYS_ON_LANGUAGE_NAMES);

// Insert the 59-language catalog on first use. Idempotent: ON CONFLICT keeps any
// existing rows (and their is_enabled choices) untouched. Base languages seed as
// enabled; everything else seeds disabled.
export const seedLanguagesIfEmpty = async (sql: SqlClient = getSql()): Promise<void> => {
  const rows = LANGUAGE_CATALOG.map((entry, index) => ({
    name: entry.name,
    isEnabled: ALWAYS_ON.has(entry.name),
    sortOrder: index,
  }));
  for (const row of rows) {
    await withTimeout(
      sql`
        INSERT INTO languages (name, is_enabled, sort_order)
        VALUES (${row.name}, ${row.isEnabled}, ${row.sortOrder})
        ON CONFLICT (name) DO NOTHING
      ` as unknown as Promise<unknown>,
    );
  }
};

const mapRow = (row: Record<string, unknown>): LanguageRow => ({
  name: String(row.name),
  isEnabled: Boolean(row.is_enabled),
  sortOrder: Number(row.sort_order ?? 0),
});

export const listLanguages = async (sql: SqlClient = getSql()): Promise<LanguageRow[]> => {
  await seedLanguagesIfEmpty(sql);
  const result = (await withTimeout(
    sql`SELECT name, is_enabled, sort_order FROM languages ORDER BY sort_order ASC` as unknown as Promise<
      Record<string, unknown>[]
    >,
  )) as Record<string, unknown>[];
  return result.map(mapRow);
};

export const listEnabledLanguages = async (
  sql: SqlClient = getSql(),
): Promise<LanguageRow[]> => {
  const all = await listLanguages(sql);
  return all.filter((row) => row.isEnabled);
};

// Apply enable/disable choices. Base languages are forced enabled regardless of
// the requested value. Unknown names are ignored. Returns the full updated list.
export const bulkSetEnabled = async (
  updates: ReadonlyArray<{ name: string; isEnabled: boolean }>,
  sql: SqlClient = getSql(),
): Promise<LanguageRow[]> => {
  await seedLanguagesIfEmpty(sql);
  const valid = new Set(LANGUAGE_CATALOG.map((entry) => entry.name));
  for (const update of updates) {
    if (!valid.has(update.name)) continue;
    const enabled = ALWAYS_ON.has(update.name) ? true : update.isEnabled;
    await withTimeout(
      sql`
        UPDATE languages
        SET is_enabled = ${enabled}, updated_at = now()
        WHERE name = ${update.name}
      ` as unknown as Promise<unknown>,
    );
  }
  return listLanguages(sql);
};
