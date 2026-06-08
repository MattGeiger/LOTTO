// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

import { neon } from "@neondatabase/serverless";

import type { PromptType, SystemPrompt, SystemPromptInput } from "./system-prompt-types";

type SqlClient = ReturnType<typeof neon>;

const getSql = (databaseUrl = process.env.DATABASE_URL): SqlClient => {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to use the system prompt store.");
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

const num = (value: unknown): number | null =>
  value === null || value === undefined ? null : Number(value);

const mapRow = (row: Record<string, unknown>): SystemPrompt => ({
  id: Number(row.id),
  name: String(row.name),
  promptType: String(row.prompt_type ?? "UI_TRANSLATION") as PromptType,
  isActive: Boolean(row.is_active),
  isDefault: Boolean(row.is_default),
  description: row.description ? String(row.description) : null,
  translationApproach: row.translation_approach ? String(row.translation_approach) : null,
  contextGuidance: row.context_guidance ? String(row.context_guidance) : null,
  additionalGuidance: row.additional_guidance ? String(row.additional_guidance) : null,
  temperature: num(row.temperature),
  topP: num(row.top_p),
  createdAt: row.created_at ? new Date(String(row.created_at)).getTime() : Date.now(),
  updatedAt: row.updated_at ? new Date(String(row.updated_at)).getTime() : Date.now(),
});

export const list = async (sql: SqlClient = getSql()): Promise<SystemPrompt[]> => {
  const rows = (await withTimeout(
    sql`SELECT * FROM system_prompts ORDER BY id ASC` as unknown as Promise<Record<string, unknown>[]>,
  )) as Record<string, unknown>[];
  return rows.map(mapRow);
};

export const get = async (id: number, sql: SqlClient = getSql()): Promise<SystemPrompt | null> => {
  const rows = (await withTimeout(
    sql`SELECT * FROM system_prompts WHERE id = ${id}` as unknown as Promise<Record<string, unknown>[]>,
  )) as Record<string, unknown>[];
  return rows[0] ? mapRow(rows[0]) : null;
};

export const insert = async (
  input: SystemPromptInput,
  sql: SqlClient = getSql(),
): Promise<SystemPrompt> => {
  const rows = (await withTimeout(
    sql`
      INSERT INTO system_prompts (
        name, prompt_type, is_active, is_default, description,
        translation_approach, context_guidance, additional_guidance,
        temperature, top_p
      ) VALUES (
        ${input.name}, ${input.promptType}, ${input.isActive ?? true}, ${input.isDefault ?? false},
        ${input.description ?? null}, ${input.translationApproach ?? null},
        ${input.contextGuidance ?? null}, ${input.additionalGuidance ?? null},
        ${input.temperature ?? null}, ${input.topP ?? null}
      ) RETURNING *
    ` as unknown as Promise<Record<string, unknown>[]>,
  )) as Record<string, unknown>[];
  return mapRow(rows[0]);
};

export const update = async (
  id: number,
  input: SystemPromptInput,
  sql: SqlClient = getSql(),
): Promise<SystemPrompt | null> => {
  const rows = (await withTimeout(
    sql`
      UPDATE system_prompts SET
        name = ${input.name},
        prompt_type = ${input.promptType},
        is_active = ${input.isActive ?? true},
        is_default = ${input.isDefault ?? false},
        description = ${input.description ?? null},
        translation_approach = ${input.translationApproach ?? null},
        context_guidance = ${input.contextGuidance ?? null},
        additional_guidance = ${input.additionalGuidance ?? null},
        temperature = ${input.temperature ?? null},
        top_p = ${input.topP ?? null},
        updated_at = now()
      WHERE id = ${id}
      RETURNING *
    ` as unknown as Promise<Record<string, unknown>[]>,
  )) as Record<string, unknown>[];
  return rows[0] ? mapRow(rows[0]) : null;
};

export const remove = async (id: number, sql: SqlClient = getSql()): Promise<boolean> => {
  const rows = (await withTimeout(
    sql`DELETE FROM system_prompts WHERE id = ${id} RETURNING id` as unknown as Promise<
      Record<string, unknown>[]
    >,
  )) as Record<string, unknown>[];
  return rows.length > 0;
};

export const getActiveTranslationPrompt = async (
  sql: SqlClient = getSql(),
): Promise<SystemPrompt | null> => {
  const rows = (await withTimeout(
    sql`
      SELECT * FROM system_prompts
      WHERE is_active = true
        AND prompt_type IN ('UI_TRANSLATION', 'INVENTORY_TRANSLATION', 'ANNOUNCEMENT_TRANSLATION')
      ORDER BY is_default DESC, updated_at DESC, id DESC
      LIMIT 1
    ` as unknown as Promise<Record<string, unknown>[]>,
  )) as Record<string, unknown>[];
  return rows[0] ? mapRow(rows[0]) : null;
};
