// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

// Neon-backed AI configuration store (production). CRUD over `ai_configurations`
// with soft delete via `deleted_at`.

import { neon } from "@neondatabase/serverless";

import type { AiConfig, AiServiceType, UnitPrice } from "./types";

type SqlClient = ReturnType<typeof neon>;

const getSql = (databaseUrl = process.env.DATABASE_URL): SqlClient => {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to use the AI configuration store.");
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

const mapRow = (row: Record<string, unknown>): AiConfig => ({
  id: Number(row.id),
  name: String(row.name),
  serviceType: String(row.service_type) as AiServiceType,
  model: String(row.model ?? ""),
  encryptedApiKey: row.encrypted_api_key ? String(row.encrypted_api_key) : null,
  salt: row.salt ? String(row.salt) : null,
  inputCost: Number(row.input_cost ?? 0),
  outputCost: Number(row.output_cost ?? 0),
  unitPrice: (String(row.unit_price ?? "per_1m") as UnitPrice),
  temperature: num(row.temperature),
  topP: num(row.top_p),
  thinkingLevel: row.thinking_level ? String(row.thinking_level) : null,
  maxTokens: num(row.max_tokens),
  inputTokenLimit: num(row.input_token_limit),
  outputTokenLimit: num(row.output_token_limit),
  isActive: Boolean(row.is_active),
  createdAt: row.created_at ? new Date(String(row.created_at)).getTime() : Date.now(),
  updatedAt: row.updated_at ? new Date(String(row.updated_at)).getTime() : Date.now(),
});

export const list = async (sql: SqlClient = getSql()): Promise<AiConfig[]> => {
  const rows = (await withTimeout(
    sql`SELECT * FROM ai_configurations WHERE deleted_at IS NULL ORDER BY id ASC` as unknown as Promise<
      Record<string, unknown>[]
    >,
  )) as Record<string, unknown>[];
  return rows.map(mapRow);
};

export const get = async (id: number, sql: SqlClient = getSql()): Promise<AiConfig | null> => {
  const rows = (await withTimeout(
    sql`SELECT * FROM ai_configurations WHERE id = ${id} AND deleted_at IS NULL` as unknown as Promise<
      Record<string, unknown>[]
    >,
  )) as Record<string, unknown>[];
  return rows[0] ? mapRow(rows[0]) : null;
};

export const insert = async (
  record: Omit<AiConfig, "id" | "createdAt" | "updatedAt">,
  sql: SqlClient = getSql(),
): Promise<AiConfig> => {
  const rows = (await withTimeout(
    sql`
      INSERT INTO ai_configurations (
        name, type, service_type, model, encrypted_api_key, salt,
        input_cost, output_cost, unit_price, temperature, top_p, thinking_level,
        max_tokens, input_token_limit, output_token_limit, is_active
      ) VALUES (
        ${record.name}, 'apikey', ${record.serviceType}, ${record.model},
        ${record.encryptedApiKey}, ${record.salt},
        ${record.inputCost}, ${record.outputCost}, ${record.unitPrice},
        ${record.temperature}, ${record.topP}, ${record.thinkingLevel},
        ${record.maxTokens}, ${record.inputTokenLimit}, ${record.outputTokenLimit},
        ${record.isActive}
      ) RETURNING *
    ` as unknown as Promise<Record<string, unknown>[]>,
  )) as Record<string, unknown>[];
  return mapRow(rows[0]);
};

export const update = async (
  id: number,
  patch: Partial<Omit<AiConfig, "id" | "createdAt">>,
  sql: SqlClient = getSql(),
): Promise<AiConfig | null> => {
  const current = await get(id, sql);
  if (!current) return null;
  const next = { ...current, ...patch };
  const rows = (await withTimeout(
    sql`
      UPDATE ai_configurations SET
        name = ${next.name},
        service_type = ${next.serviceType},
        model = ${next.model},
        encrypted_api_key = ${next.encryptedApiKey},
        salt = ${next.salt},
        input_cost = ${next.inputCost},
        output_cost = ${next.outputCost},
        unit_price = ${next.unitPrice},
        temperature = ${next.temperature},
        top_p = ${next.topP},
        thinking_level = ${next.thinkingLevel},
        max_tokens = ${next.maxTokens},
        input_token_limit = ${next.inputTokenLimit},
        output_token_limit = ${next.outputTokenLimit},
        is_active = ${next.isActive},
        updated_at = now()
      WHERE id = ${id} AND deleted_at IS NULL
      RETURNING *
    ` as unknown as Promise<Record<string, unknown>[]>,
  )) as Record<string, unknown>[];
  return rows[0] ? mapRow(rows[0]) : null;
};

export const remove = async (id: number, sql: SqlClient = getSql()): Promise<boolean> => {
  const rows = (await withTimeout(
    sql`
      UPDATE ai_configurations SET deleted_at = now(), is_active = false
      WHERE id = ${id} AND deleted_at IS NULL
      RETURNING id
    ` as unknown as Promise<Record<string, unknown>[]>,
  )) as Record<string, unknown>[];
  return rows.length > 0;
};
