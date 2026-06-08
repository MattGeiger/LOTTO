// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import type { SystemPrompt, SystemPromptInput } from "./system-prompt-types";

const filePath = join(process.cwd(), "data", "system-prompts.json");

const readAll = async (): Promise<SystemPrompt[]> => {
  try {
    return JSON.parse(await readFile(filePath, "utf8")) as SystemPrompt[];
  } catch {
    return [];
  }
};

const writeAll = async (rows: SystemPrompt[]) => {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(rows, null, 2)}\n`, "utf8");
};

const fromInput = (input: SystemPromptInput, id: number, existing?: SystemPrompt): SystemPrompt => {
  const now = Date.now();
  return {
    id,
    name: input.name,
    promptType: input.promptType,
    isActive: input.isActive ?? true,
    isDefault: input.isDefault ?? false,
    description: input.description ?? null,
    translationApproach: input.translationApproach ?? null,
    contextGuidance: input.contextGuidance ?? null,
    additionalGuidance: input.additionalGuidance ?? null,
    temperature: input.temperature ?? null,
    topP: input.topP ?? null,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
};

export const list = async (): Promise<SystemPrompt[]> => readAll();

export const get = async (id: number): Promise<SystemPrompt | null> => {
  const rows = await readAll();
  return rows.find((row) => row.id === id) ?? null;
};

export const insert = async (input: SystemPromptInput): Promise<SystemPrompt> => {
  const rows = await readAll();
  const id = rows.reduce((max, row) => Math.max(max, row.id), 0) + 1;
  const row = fromInput(input, id);
  rows.push(row);
  await writeAll(rows);
  return row;
};

export const update = async (id: number, input: SystemPromptInput): Promise<SystemPrompt | null> => {
  const rows = await readAll();
  const index = rows.findIndex((row) => row.id === id);
  if (index < 0) return null;
  rows[index] = fromInput(input, id, rows[index]);
  await writeAll(rows);
  return rows[index];
};

export const remove = async (id: number): Promise<boolean> => {
  const rows = await readAll();
  const next = rows.filter((row) => row.id !== id);
  if (next.length === rows.length) return false;
  await writeAll(next);
  return true;
};

export const getActiveTranslationPrompt = async (): Promise<SystemPrompt | null> => {
  const rows = await readAll();
  return (
    rows
      .filter((row) =>
        row.isActive &&
        ["UI_TRANSLATION", "INVENTORY_TRANSLATION", "ANNOUNCEMENT_TRANSLATION"].includes(row.promptType),
      )
      .sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || b.updatedAt - a.updatedAt || b.id - a.id)[0] ??
    null
  );
};
