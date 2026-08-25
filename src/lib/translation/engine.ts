// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

// Translation engine: turns `pending` rows into `completed` (or `failed`) by
// calling the active AI configuration's provider in bounded structured batches.

import { randomUUID } from "node:crypto";

import { decryptApiKey } from "@/lib/ai/encryption";
import { getActiveConfig } from "@/lib/ai/ai-config-service";
import { normalizeTranslationOutputBudget } from "@/lib/ai/output-budget";
import {
  BatchResponseValidationError,
  translateTextBatch,
  type TranslateParams,
} from "@/lib/ai/translate";
import * as store from "./translations-store";
import type { TranslationBatchUpdate, TranslationRecord } from "./types";

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
    maxTokens: normalizeTranslationOutputBudget(config.maxTokens, config.outputTokenLimit),
    temperature: config.temperature,
    inputCost: config.inputCost,
    outputCost: config.outputCost,
    unitPrice: config.unitPrice,
  };
};

export type ProcessResult = {
  translated: number;
  failed: number;
  remaining: number;
  providerRequests: number;
};

// Process content in stages (spec): deployment-authored visitor copy is small
// and immediately visible, UI strings are essential usability, and inventory is
// lowest priority. Pending rows are processed in this order so partial readiness
// arrives soonest.
const TYPE_PRIORITY: Record<TranslationRecord["type"], number> = {
  announcement: 0,
  brand_string: 1,
  ui_string: 2,
  inventory: 3,
};

// One serverless invocation processes one same-language/content batch. A batch
// of 100 short strings remains comfortably below LOTTO's 8,192-token operating
// budget while collapsing the former one-model-request-per-row behavior.
export const TRANSLATION_BATCH_SIZE = 100;

const orderPending = (rows: TranslationRecord[]): TranslationRecord[] =>
  [...rows].sort(
    (a, b) => TYPE_PRIORITY[a.type] - TYPE_PRIORITY[b.type] || a.id - b.id,
  );

const allocateIntegerTotal = (
  total: number | null,
  weights: ReadonlyArray<number>,
): Array<number | null> => {
  if (total == null) return weights.map(() => null);
  if (weights.length === 0) return [];
  const safeWeights = weights.map((weight) => Math.max(1, weight));
  const weightTotal = safeWeights.reduce((sum, weight) => sum + weight, 0);
  const exact = safeWeights.map((weight) => (total * weight) / weightTotal);
  const allocated = exact.map(Math.floor);
  const remainder = total - allocated.reduce((sum, value) => sum + value, 0);
  const byLargestFraction = exact
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  for (let index = 0; index < remainder; index += 1) {
    allocated[byLargestFraction[index % byLargestFraction.length].index] += 1;
  }
  return allocated;
};

const tokenCost = (
  promptTokens: number | null,
  completionTokens: number | null,
  params: TranslateParams,
): number | null => {
  if (promptTokens == null && completionTokens == null) return null;
  const divisor = params.unitPrice === "per_1k" ? 1_000 : 1_000_000;
  return (
    ((promptTokens ?? 0) * (params.inputCost ?? 0) +
      (completionTokens ?? 0) * (params.outputCost ?? 0)) /
    divisor
  );
};

type BatchProcessResult = Omit<ProcessResult, "remaining">;

const failedPatches = (
  records: ReadonlyArray<TranslationRecord>,
  params: TranslateParams,
  error: unknown,
): TranslationBatchUpdate[] => {
  const failedAt = Date.now();
  const message = error instanceof Error ? error.message : "Translation failed.";
  return records.map((record) => ({
    id: record.id,
    translatedText: record.translatedText,
    status: "failed",
    promptTokens: record.promptTokens,
    completionTokens: record.completionTokens,
    totalCost: record.totalCost,
    metadata: {
      ...(record.metadata ?? {}),
      provider: params.serviceType,
      model: params.model,
      batchSize: records.length,
      error: message,
      failedAt,
    },
  }));
};

const translateRecordBatch = async (
  records: ReadonlyArray<TranslationRecord>,
  params: TranslateParams,
  allowValidationSplit = true,
): Promise<BatchProcessResult> => {
  if (records.length === 0) return { translated: 0, failed: 0, providerRequests: 0 };
  try {
    const result = await translateTextBatch(
      params,
      records.map((record) => ({ id: String(record.id), text: record.originalText })),
      records[0].language,
    );
    const batchId = randomUUID();
    const promptAllocations = allocateIntegerTotal(
      result.promptTokens,
      records.map((record) => record.originalText.length),
    );
    const completionAllocations = allocateIntegerTotal(
      result.completionTokens,
      result.translations.map((translation) => translation.text.length),
    );
    const patches: TranslationBatchUpdate[] = records.map((record, index) => {
      const translation = result.translations[index];
      const promptTokens = promptAllocations[index];
      const completionTokens = completionAllocations[index];
      return {
        id: record.id,
        translatedText: translation.text,
        status: "completed",
        promptTokens,
        completionTokens,
        totalCost: tokenCost(promptTokens, completionTokens, params),
        metadata: {
          provider: params.serviceType,
          model: params.model,
          batchId,
          batchSize: records.length,
          batchIndex: index,
          batchPromptTokens: result.promptTokens,
          batchCompletionTokens: result.completionTokens,
          maxOutputTokens: result.maxOutputTokens,
        },
      };
    });
    await store.bulkUpdate(patches);
    return { translated: records.length, failed: 0, providerRequests: 1 };
  } catch (error) {
    // A structurally invalid response may be size-related. Split it once so one
    // malformed large response does not discard the entire batch; ordinary HTTP
    // and provider failures are not multiplied into retry storms.
    if (
      allowValidationSplit &&
      error instanceof BatchResponseValidationError &&
      records.length > 1
    ) {
      const middle = Math.ceil(records.length / 2);
      const left = await translateRecordBatch(records.slice(0, middle), params, false);
      const right = await translateRecordBatch(records.slice(middle), params, false);
      return {
        translated: left.translated + right.translated,
        failed: left.failed + right.failed,
        providerRequests: 1 + left.providerRequests + right.providerRequests,
      };
    }
    await store.bulkUpdate(failedPatches(records, params, error));
    return { translated: 0, failed: records.length, providerRequests: 1 };
  }
};

const groupsOf = (records: ReadonlyArray<TranslationRecord>): TranslationRecord[][] => {
  const groups = new Map<string, TranslationRecord[]>();
  for (const record of records) {
    const key = `${record.type}\u0000${record.language}`;
    const group = groups.get(key);
    if (group) group.push(record);
    else groups.set(key, [record]);
  }
  const batches: TranslationRecord[][] = [];
  for (const group of groups.values()) {
    for (let start = 0; start < group.length; start += TRANSLATION_BATCH_SIZE) {
      batches.push(group.slice(start, start + TRANSLATION_BATCH_SIZE));
    }
  }
  return batches;
};

// Translate a specific set of pending/failed rows by id.
export const translateRowsByIds = async (ids: number[]): Promise<ProcessResult> => {
  if (ids.length === 0) {
    return { translated: 0, failed: 0, remaining: 0, providerRequests: 0 };
  }
  const params = await resolveParams();
  const records: TranslationRecord[] = [];
  for (const id of ids) {
    const record = await store.get(id);
    if (record) records.push(record);
  }
  let translated = 0;
  let failed = 0;
  let providerRequests = 0;
  for (const batch of groupsOf(records)) {
    const result = await translateRecordBatch(batch, params);
    translated += result.translated;
    failed += result.failed;
    providerRequests += result.providerRequests;
  }
  const remaining = (await store.list({ status: "pending" })).length;
  return { translated, failed, remaining, providerRequests };
};

// Translate one highest-priority same-language/content batch; reports how many
// pending rows remain so the authenticated preparation flow can advance it.
export const translatePending = async (limit = TRANSLATION_BATCH_SIZE): Promise<ProcessResult> => {
  const allPending = await store.list({ status: "pending" });
  const ordered = orderPending(allPending);
  const first = ordered[0];
  if (!first) return { translated: 0, failed: 0, remaining: 0, providerRequests: 0 };
  const batch = ordered
    .filter((record) => record.type === first.type && record.language === first.language)
    .slice(0, Math.min(limit, TRANSLATION_BATCH_SIZE));
  const params = await resolveParams();
  const result = await translateRecordBatch(batch, params);
  return { ...result, remaining: Math.max(0, allPending.length - batch.length) };
};
