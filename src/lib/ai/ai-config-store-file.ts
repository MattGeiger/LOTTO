// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

// File-backed AI configuration store for local development (mirrors the file/db
// split in `state-manager.ts`). Production uses the Neon backend.

import fs from "node:fs/promises";
import path from "node:path";

import type { AiConfig } from "./types";

type FileShape = { nextId: number; configs: AiConfig[] };

const filePath = () => path.join(process.cwd(), "data", "ai-configs.json");

const read = async (): Promise<FileShape> => {
  try {
    const raw = await fs.readFile(filePath(), "utf8");
    const parsed = JSON.parse(raw) as FileShape;
    return { nextId: parsed.nextId ?? 1, configs: parsed.configs ?? [] };
  } catch {
    return { nextId: 1, configs: [] };
  }
};

const write = async (data: FileShape): Promise<void> => {
  await fs.mkdir(path.dirname(filePath()), { recursive: true });
  await fs.writeFile(filePath(), JSON.stringify(data, null, 2), "utf8");
};

export const list = async (): Promise<AiConfig[]> => {
  const { configs } = await read();
  return configs;
};

export const get = async (id: number): Promise<AiConfig | null> => {
  const { configs } = await read();
  return configs.find((config) => config.id === id) ?? null;
};

export const insert = async (
  record: Omit<AiConfig, "id" | "createdAt" | "updatedAt">,
): Promise<AiConfig> => {
  const data = await read();
  const now = Date.now();
  const config: AiConfig = { ...record, id: data.nextId, createdAt: now, updatedAt: now };
  data.configs.push(config);
  data.nextId += 1;
  await write(data);
  return config;
};

export const update = async (
  id: number,
  patch: Partial<Omit<AiConfig, "id" | "createdAt">>,
): Promise<AiConfig | null> => {
  const data = await read();
  const index = data.configs.findIndex((config) => config.id === id);
  if (index === -1) return null;
  data.configs[index] = { ...data.configs[index], ...patch, id, updatedAt: Date.now() };
  await write(data);
  return data.configs[index];
};

export const remove = async (id: number): Promise<boolean> => {
  const data = await read();
  const before = data.configs.length;
  data.configs = data.configs.filter((config) => config.id !== id);
  if (data.configs.length === before) return false;
  await write(data);
  return true;
};
