// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

// File-backed translations store for local development (mirrors the file/db
// split in `state-manager.ts`). Production uses the Neon backend.

import fs from "node:fs/promises";
import path from "node:path";

import type { TranslationFilter, TranslationKey, TranslationRecord } from "./types";

type FileShape = { nextId: number; records: TranslationRecord[] };

const filePath = () => path.join(process.cwd(), "data", "translations.json");

const read = async (): Promise<FileShape> => {
  try {
    const raw = await fs.readFile(filePath(), "utf8");
    const parsed = JSON.parse(raw) as FileShape;
    return { nextId: parsed.nextId ?? 1, records: parsed.records ?? [] };
  } catch {
    return { nextId: 1, records: [] };
  }
};

const write = async (data: FileShape): Promise<void> => {
  await fs.mkdir(path.dirname(filePath()), { recursive: true });
  await fs.writeFile(filePath(), JSON.stringify(data, null, 2), "utf8");
};

const matches = (record: TranslationRecord, filter?: TranslationFilter): boolean => {
  if (!filter) return true;
  if (filter.language && record.language !== filter.language) return false;
  if (filter.type && record.type !== filter.type) return false;
  if (filter.status && record.status !== filter.status) return false;
  return true;
};

export const list = async (filter?: TranslationFilter): Promise<TranslationRecord[]> => {
  const { records } = await read();
  return records.filter((r) => matches(r, filter)).sort((a, b) => a.id - b.id);
};

export const get = async (id: number): Promise<TranslationRecord | null> => {
  const { records } = await read();
  return records.find((r) => r.id === id) ?? null;
};

// Insert or update by the (originalText, language, type) unique key.
export const upsert = async (
  key: TranslationKey,
  fields: Partial<Omit<TranslationRecord, "id" | "createdAt">>,
): Promise<TranslationRecord> => {
  const data = await read();
  const now = Date.now();
  const index = data.records.findIndex(
    (r) => r.originalText === key.originalText && r.language === key.language && r.type === key.type,
  );
  if (index === -1) {
    const record: TranslationRecord = {
      id: data.nextId,
      originalText: key.originalText,
      language: key.language,
      type: key.type,
      translatedText: null,
      status: "pending",
      metadata: null,
      promptTokens: null,
      completionTokens: null,
      totalCost: null,
      createdAt: now,
      updatedAt: now,
      ...fields,
    };
    data.records.push(record);
    data.nextId += 1;
    await write(data);
    return record;
  }
  data.records[index] = { ...data.records[index], ...fields, updatedAt: now };
  await write(data);
  return data.records[index];
};

export const update = async (
  id: number,
  patch: Partial<Omit<TranslationRecord, "id" | "createdAt">>,
): Promise<TranslationRecord | null> => {
  const data = await read();
  const index = data.records.findIndex((r) => r.id === id);
  if (index === -1) return null;
  data.records[index] = { ...data.records[index], ...patch, id, updatedAt: Date.now() };
  await write(data);
  return data.records[index];
};

export const remove = async (id: number): Promise<boolean> => {
  const data = await read();
  const before = data.records.length;
  data.records = data.records.filter((r) => r.id !== id);
  if (data.records.length === before) return false;
  await write(data);
  return true;
};

export const bulkRemove = async (ids: number[]): Promise<number> => {
  const data = await read();
  const idSet = new Set(ids);
  const before = data.records.length;
  data.records = data.records.filter((r) => !idSet.has(r.id));
  const removed = before - data.records.length;
  if (removed > 0) await write(data);
  return removed;
};
