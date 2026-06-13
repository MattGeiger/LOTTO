// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

// Translation engine: turns `pending` rows into `completed` (or `failed`) by
// calling the active AI configuration's provider. Ported in spirit from FEED's
// translation-trigger, simplified to per-row REST calls (serverless-friendly:
// callers await processing inline).

import { decryptApiKey } from "@/lib/ai/encryption";
import { getActiveConfig } from "@/lib/ai/ai-config-service";
import { translateText, type TranslateParams } from "@/lib/ai/translate";
import * as store from "./translations-store";
import type { TranslationRecord } from "./types";

export class NoActiveConfigError extends Error {
  constructor() {
    super("No active AI configuration. Add one in the AI Configuration tab first.");
    this.name = "NoActiveConfigError";
  }
}

const resolveParams = async (): Promise<TranslateParams> => {
  const config = await getActiveConfig();
  if (!config || !config.encryptedApiKey || !config.salt) {
    throw new NoActiveConfigError();
  }
  const apiKey = decryptApiKey(config.encryptedApiKey, config.salt);
  return {
    serviceType: config.serviceType,
    apiKey,
    model: config.model,
    maxTokens: config.maxTokens,
    temperature: config.temperature,
  };
};

const translateRow = async (
  record: TranslationRecord,
  params: TranslateParams,
): Promise<boolean> => {
  try {
    const result = await translateText(params, record.originalText, record.language);
    await store.update(record.id, {
      translatedText: result.text,
      status: "completed",
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      // Auditability (spec): record which provider/model produced each
      // translation, for troubleshooting, quality review, and comparison.
      metadata: { provider: params.serviceType, model: params.model },
    });
    return true;
  } catch (error) {
    await store.update(record.id, {
      status: "failed",
      metadata: {
        ...(record.metadata ?? {}),
        provider: params.serviceType,
        model: params.model,
        error: error instanceof Error ? error.message : "Translation failed.",
        failedAt: Date.now(),
      },
    });
    return false;
  }
};

export type ProcessResult = { translated: number; failed: number; remaining: number };

// Process content in stages (spec): the announcement is a single fast call, UI
// strings are essential usability, inventory is lowest priority. Pending rows are
// processed in this order so partial readiness arrives soonest.
const TYPE_PRIORITY: Record<TranslationRecord["type"], number> = {
  announcement: 0,
  ui_string: 1,
  inventory: 2,
};

// Bounded chunk per request so a single serverless invocation never has to make
// hundreds of sequential provider calls (which would time out). Callers loop
// until `remaining` is 0.
export const TRANSLATION_CHUNK_SIZE = 25;

const orderPending = (rows: TranslationRecord[]): TranslationRecord[] =>
  [...rows].sort(
    (a, b) => TYPE_PRIORITY[a.type] - TYPE_PRIORITY[b.type] || a.id - b.id,
  );

// Translate a specific set of pending/failed rows by id.
export const translateRowsByIds = async (ids: number[]): Promise<ProcessResult> => {
  if (ids.length === 0) return { translated: 0, failed: 0, remaining: 0 };
  const params = await resolveParams();
  let translated = 0;
  let failed = 0;
  for (const id of ids) {
    const record = await store.get(id);
    if (!record) continue;
    const ok = await translateRow(record, params);
    if (ok) translated += 1;
    else failed += 1;
  }
  const remaining = (await store.list({ status: "pending" })).length;
  return { translated, failed, remaining };
};

// Translate up to `limit` pending rows in staged order; reports how many pending
// rows remain so the caller can loop.
export const translatePending = async (limit = TRANSLATION_CHUNK_SIZE): Promise<ProcessResult> => {
  const allPending = await store.list({ status: "pending" });
  const chunk = orderPending(allPending).slice(0, limit);
  if (chunk.length === 0) return { translated: 0, failed: 0, remaining: 0 };
  const params = await resolveParams();
  let translated = 0;
  let failed = 0;
  for (const record of chunk) {
    const ok = await translateRow(record, params);
    if (ok) translated += 1;
    else failed += 1;
  }
  // Remaining = rows we didn't touch this chunk (failures move to "failed").
  return { translated, failed, remaining: Math.max(0, allPending.length - chunk.length) };
};
