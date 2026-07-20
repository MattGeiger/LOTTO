// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. Agency branding is not covered
// by this license; see TRADEMARKS.md.

// File-backed brand-configuration store for local development (mirrors the
// file/db split in `state-manager.ts`). Production uses `store-db.ts`.

import fs from "node:fs/promises";
import path from "node:path";

import type { BrandConfigurationRow } from "./types";

// BRAND_CONFIG_FILE lets tests isolate the store away from the dev data dir
// (vitest.setup.ts points it at a per-worker temp file).
const filePath = () =>
  process.env.BRAND_CONFIG_FILE ??
  path.join(process.cwd(), "data", "brand-config.json");

type FileState = {
  configurations: BrandConfigurationRow[];
};

const readState = async (): Promise<FileState> => {
  try {
    const raw = await fs.readFile(filePath(), "utf8");
    const parsed = JSON.parse(raw) as FileState;
    return Array.isArray(parsed.configurations) ? parsed : { configurations: [] };
  } catch {
    return { configurations: [] };
  }
};

const writeState = async (state: FileState): Promise<void> => {
  const dir = path.dirname(filePath());
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(filePath(), JSON.stringify(state, null, 2), "utf8");
};

export const listConfigurations = async (): Promise<BrandConfigurationRow[]> => {
  const { configurations } = await readState();
  return [...configurations].sort((a, b) =>
    a.isTemplate === b.isTemplate
      ? b.updatedAt.localeCompare(a.updatedAt)
      : a.isTemplate
        ? -1
        : 1,
  );
};

export const getConfiguration = async (
  id: string,
): Promise<BrandConfigurationRow | null> => {
  const { configurations } = await readState();
  return configurations.find((row) => row.id === id) ?? null;
};

export const getActiveConfiguration =
  async (): Promise<BrandConfigurationRow | null> => {
    const { configurations } = await readState();
    return configurations.find((row) => row.isActive) ?? null;
  };

export const saveConfiguration = async (
  id: string,
  payload: unknown,
): Promise<void> => {
  const state = await readState();
  const existing = state.configurations.find((row) => row.id === id);
  if (existing) {
    if (existing.isTemplate) return; // templates are read-only
    existing.payload = payload;
    existing.updatedAt = new Date().toISOString();
  } else {
    state.configurations.push({
      id,
      payload,
      isActive: false,
      isTemplate: false,
      updatedAt: new Date().toISOString(),
    });
  }
  await writeState(state);
};

export const seedTemplate = async (id: string, payload: unknown): Promise<void> => {
  const state = await readState();
  if (state.configurations.some((row) => row.id === id)) return;
  state.configurations.push({
    id,
    payload,
    isActive: false,
    isTemplate: true,
    updatedAt: new Date().toISOString(),
  });
  await writeState(state);
};

export const activateConfiguration = async (id: string): Promise<void> => {
  const state = await readState();
  const target = state.configurations.find((row) => row.id === id);
  if (!target || target.isTemplate) return;
  for (const row of state.configurations) {
    row.isActive = row.id === id;
  }
  target.updatedAt = new Date().toISOString();
  await writeState(state);
};

export const deactivateAll = async (): Promise<void> => {
  const state = await readState();
  for (const row of state.configurations) {
    row.isActive = false;
  }
  await writeState(state);
};

export const deleteConfiguration = async (id: string): Promise<void> => {
  const state = await readState();
  state.configurations = state.configurations.filter(
    (row) => row.id !== id || row.isTemplate,
  );
  await writeState(state);
};
