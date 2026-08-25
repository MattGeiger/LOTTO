// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

// Neon-backed translations store (production). CRUD over `translations`, keyed by
// the (original_text, language, type) unique constraint.

import { neon } from "@neondatabase/serverless";

import type {
  TranslationFilter,
  TranslationBatchUpdate,
  TranslationKey,
  TranslationRecord,
  TranslationStatus,
  TranslationType,
} from "./types";

type SqlClient = ReturnType<typeof neon>;

const getSql = (databaseUrl = process.env.DATABASE_URL): SqlClient => {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to use the translations store.");
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

const mapRow = (row: Record<string, unknown>): TranslationRecord => ({
  id: Number(row.id),
  originalText: String(row.original_text),
  translatedText: row.translated_text === null || row.translated_text === undefined ? null : String(row.translated_text),
  status: String(row.status) as TranslationStatus,
  language: String(row.language),
  type: String(row.type) as TranslationType,
  metadata: (row.metadata as Record<string, unknown> | null) ?? null,
  promptTokens: row.prompt_tokens === null || row.prompt_tokens === undefined ? null : Number(row.prompt_tokens),
  completionTokens: row.completion_tokens === null || row.completion_tokens === undefined ? null : Number(row.completion_tokens),
  totalCost: row.total_cost === null || row.total_cost === undefined ? null : Number(row.total_cost),
  createdAt: row.created_at ? new Date(String(row.created_at)).getTime() : Date.now(),
  updatedAt: row.updated_at ? new Date(String(row.updated_at)).getTime() : Date.now(),
});

export const list = async (
  filter?: TranslationFilter,
  sql: SqlClient = getSql(),
): Promise<TranslationRecord[]> => {
  const language = filter?.language ?? null;
  const type = filter?.type ?? null;
  const status = filter?.status ?? null;
  const rows = (await withTimeout(
    sql`
      SELECT * FROM translations
      WHERE (${language}::text IS NULL OR language = ${language})
        AND (${type}::text IS NULL OR type = ${type})
        AND (${status}::text IS NULL OR status = ${status})
      ORDER BY id ASC
    ` as unknown as Promise<Record<string, unknown>[]>,
  )) as Record<string, unknown>[];
  return rows.map(mapRow);
};

export const get = async (id: number, sql: SqlClient = getSql()): Promise<TranslationRecord | null> => {
  const rows = (await withTimeout(
    sql`SELECT * FROM translations WHERE id = ${id}` as unknown as Promise<Record<string, unknown>[]>,
  )) as Record<string, unknown>[];
  return rows[0] ? mapRow(rows[0]) : null;
};

export const upsert = async (
  key: TranslationKey,
  fields: Partial<Omit<TranslationRecord, "id" | "createdAt">>,
  sql: SqlClient = getSql(),
): Promise<TranslationRecord> => {
  const translatedText = fields.translatedText ?? null;
  const status: TranslationStatus = fields.status ?? "pending";
  const metadata = fields.metadata ? JSON.stringify(fields.metadata) : null;
  const promptTokens = fields.promptTokens ?? null;
  const completionTokens = fields.completionTokens ?? null;
  const totalCost = fields.totalCost ?? null;
  const rows = (await withTimeout(
    sql`
      INSERT INTO translations (
        original_text, language, type, translated_text, status, metadata,
        prompt_tokens, completion_tokens, total_cost
      ) VALUES (
        ${key.originalText}, ${key.language}, ${key.type}, ${translatedText}, ${status}, ${metadata},
        ${promptTokens}, ${completionTokens}, ${totalCost}
      )
      ON CONFLICT (original_text, language, type) DO UPDATE SET
        translated_text = EXCLUDED.translated_text,
        status = EXCLUDED.status,
        metadata = EXCLUDED.metadata,
        prompt_tokens = EXCLUDED.prompt_tokens,
        completion_tokens = EXCLUDED.completion_tokens,
        total_cost = EXCLUDED.total_cost,
        updated_at = now()
      RETURNING *
    ` as unknown as Promise<Record<string, unknown>[]>,
  )) as Record<string, unknown>[];
  return mapRow(rows[0]);
};

export const update = async (
  id: number,
  patch: Partial<Omit<TranslationRecord, "id" | "createdAt">>,
  sql: SqlClient = getSql(),
): Promise<TranslationRecord | null> => {
  const current = await get(id, sql);
  if (!current) return null;
  const next = { ...current, ...patch };
  const metadata = next.metadata ? JSON.stringify(next.metadata) : null;
  const rows = (await withTimeout(
    sql`
      UPDATE translations SET
        translated_text = ${next.translatedText},
        status = ${next.status},
        metadata = ${metadata},
        prompt_tokens = ${next.promptTokens},
        completion_tokens = ${next.completionTokens},
        total_cost = ${next.totalCost},
        updated_at = now()
      WHERE id = ${id}
      RETURNING *
    ` as unknown as Promise<Record<string, unknown>[]>,
  )) as Record<string, unknown>[];
  return rows[0] ? mapRow(rows[0]) : null;
};

export const bulkUpdate = async (
  patches: ReadonlyArray<TranslationBatchUpdate>,
  sql: SqlClient = getSql(),
): Promise<TranslationRecord[]> => {
  if (patches.length === 0) return [];
  const payload = JSON.stringify(
    patches.map((patch) => ({
      id: patch.id,
      translated_text: patch.translatedText,
      status: patch.status,
      metadata: patch.metadata,
      prompt_tokens: patch.promptTokens,
      completion_tokens: patch.completionTokens,
      total_cost: patch.totalCost,
    })),
  );
  const rows = (await withTimeout(
    sql`
      UPDATE translations AS translation
      SET
        translated_text = patch.translated_text,
        status = patch.status,
        metadata = patch.metadata,
        prompt_tokens = patch.prompt_tokens,
        completion_tokens = patch.completion_tokens,
        total_cost = patch.total_cost,
        updated_at = now()
      FROM jsonb_to_recordset(${payload}::jsonb) AS patch(
        id bigint,
        translated_text text,
        status text,
        metadata jsonb,
        prompt_tokens integer,
        completion_tokens integer,
        total_cost double precision
      )
      WHERE translation.id = patch.id
      RETURNING translation.*
    ` as unknown as Promise<Record<string, unknown>[]>,
  )) as Record<string, unknown>[];
  return rows.map(mapRow).sort((a, b) => a.id - b.id);
};

export const remove = async (id: number, sql: SqlClient = getSql()): Promise<boolean> => {
  const rows = (await withTimeout(
    sql`DELETE FROM translations WHERE id = ${id} RETURNING id` as unknown as Promise<
      Record<string, unknown>[]
    >,
  )) as Record<string, unknown>[];
  return rows.length > 0;
};

export const bulkRemove = async (ids: number[], sql: SqlClient = getSql()): Promise<number> => {
  if (ids.length === 0) return 0;
  const rows = (await withTimeout(
    sql`DELETE FROM translations WHERE id = ANY(${ids}) RETURNING id` as unknown as Promise<
      Record<string, unknown>[]
    >,
  )) as Record<string, unknown>[];
  return rows.length;
};
