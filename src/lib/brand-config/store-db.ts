// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. Agency branding is not covered
// by this license; see TRADEMARKS.md.

// Neon-backed brand-configuration store. Mirrors the file/db split used by
// `state-manager.ts` and the translation stores; the facade in `store.ts`
// selects this backend when a database is configured.

import { neon } from "@neondatabase/serverless";

import type { BrandConfigurationRow } from "./types";

type SqlClient = ReturnType<typeof neon>;

const getSql = (databaseUrl = process.env.DATABASE_URL): SqlClient => {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to use the brand configuration store.");
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

type DbRow = {
  id: string;
  payload: unknown;
  is_active: boolean;
  is_template: boolean;
  updated_at: string;
};

const toRow = (row: DbRow): BrandConfigurationRow => ({
  id: row.id,
  payload: row.payload,
  isActive: row.is_active,
  isTemplate: row.is_template,
  updatedAt: new Date(row.updated_at).toISOString(),
});

export const listConfigurations = async (): Promise<BrandConfigurationRow[]> => {
  const sql = getSql();
  const rows = (await withTimeout(
    sql`SELECT id, payload, is_active, is_template, updated_at
        FROM brand_configurations
        ORDER BY is_template DESC, updated_at DESC`,
  )) as DbRow[];
  return rows.map(toRow);
};

export const getConfiguration = async (
  id: string,
): Promise<BrandConfigurationRow | null> => {
  const sql = getSql();
  const rows = (await withTimeout(
    sql`SELECT id, payload, is_active, is_template, updated_at
        FROM brand_configurations WHERE id = ${id}`,
  )) as DbRow[];
  return rows.length > 0 ? toRow(rows[0]) : null;
};

export const getActiveConfiguration =
  async (): Promise<BrandConfigurationRow | null> => {
    const sql = getSql();
    const rows = (await withTimeout(
      sql`SELECT id, payload, is_active, is_template, updated_at
          FROM brand_configurations WHERE is_active`,
    )) as DbRow[];
    return rows.length > 0 ? toRow(rows[0]) : null;
  };

export const saveConfiguration = async (
  id: string,
  payload: unknown,
): Promise<void> => {
  const sql = getSql();
  await withTimeout(
    sql`INSERT INTO brand_configurations (id, payload, is_active, is_template)
        VALUES (${id}, ${JSON.stringify(payload)}::jsonb, false, false)
        ON CONFLICT (id) DO UPDATE SET
          payload = EXCLUDED.payload,
          updated_at = now()`,
  );
};

/** Seed a template row; never overwrites an existing row with the same id. */
export const seedTemplate = async (id: string, payload: unknown): Promise<void> => {
  const sql = getSql();
  await withTimeout(
    sql`INSERT INTO brand_configurations (id, payload, is_active, is_template)
        VALUES (${id}, ${JSON.stringify(payload)}::jsonb, false, true)
        ON CONFLICT (id) DO NOTHING`,
  );
};

/** Remove a retired compiled template without touching saved appearances. */
export const deleteTemplate = async (id: string): Promise<void> => {
  const sql = getSql();
  await withTimeout(
    sql`DELETE FROM brand_configurations WHERE id = ${id} AND is_template`,
  );
};

export const activateConfiguration = async (id: string): Promise<void> => {
  const sql = getSql();
  // Two statements; the partial unique index enforces the single-active
  // invariant even if a concurrent writer races between them.
  await withTimeout(sql`UPDATE brand_configurations SET is_active = false WHERE is_active`);
  await withTimeout(
    sql`UPDATE brand_configurations
        SET is_active = true, updated_at = now()
        WHERE id = ${id} AND NOT is_template`,
  );
};

export const deactivateAll = async (): Promise<void> => {
  const sql = getSql();
  await withTimeout(
    sql`UPDATE brand_configurations SET is_active = false WHERE is_active`,
  );
};

export const deleteConfiguration = async (id: string): Promise<void> => {
  const sql = getSql();
  await withTimeout(
    sql`DELETE FROM brand_configurations WHERE id = ${id} AND NOT is_template`,
  );
};
