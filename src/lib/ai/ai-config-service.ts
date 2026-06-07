// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

// AI configuration service: wraps the store with API-key encryption and exposes
// client-safe views. Plaintext keys never leave this layer except via
// getDecryptedApiKey (server-only, used for validation and translation).

import { encryptApiKey } from "./encryption";
import * as store from "./ai-config-store";
import {
  toPublicConfig,
  type AiConfig,
  type AiConfigInput,
  type AiConfigPublic,
} from "./types";

export const listConfigs = async (): Promise<AiConfigPublic[]> => {
  const configs = await store.list();
  return configs.map(toPublicConfig);
};

const applyInput = (input: AiConfigInput): Partial<Omit<AiConfig, "id" | "createdAt">> => {
  const patch: Partial<Omit<AiConfig, "id" | "createdAt">> = {
    name: input.name,
    serviceType: input.serviceType,
    model: input.model,
    inputCost: input.inputCost ?? 0,
    outputCost: input.outputCost ?? 0,
    unitPrice: input.unitPrice ?? "per_1m",
    temperature: input.temperature ?? null,
    topP: input.topP ?? null,
    thinkingLevel: input.thinkingLevel ?? null,
    maxTokens: input.maxTokens ?? null,
    inputTokenLimit: input.inputTokenLimit ?? null,
    outputTokenLimit: input.outputTokenLimit ?? null,
    isActive: input.isActive ?? true,
  };
  return patch;
};

export const createConfig = async (input: AiConfigInput): Promise<AiConfigPublic> => {
  if (!input.apiKey) {
    throw new Error("An API key is required to create a configuration.");
  }
  const { encrypted, salt } = encryptApiKey(input.apiKey);
  const record = {
    ...applyInput(input),
    encryptedApiKey: encrypted,
    salt,
  } as Omit<AiConfig, "id" | "createdAt" | "updatedAt">;
  const created = await store.insert(record);
  return toPublicConfig(created);
};

export const updateConfig = async (
  id: number,
  input: AiConfigInput,
): Promise<AiConfigPublic | null> => {
  const patch = applyInput(input);
  // Re-encrypt only when a new key is supplied; otherwise keep the stored one.
  if (input.apiKey) {
    const { encrypted, salt } = encryptApiKey(input.apiKey);
    patch.encryptedApiKey = encrypted;
    patch.salt = salt;
  }
  const updated = await store.update(id, patch);
  return updated ? toPublicConfig(updated) : null;
};

export const deleteConfig = async (id: number): Promise<boolean> => {
  return store.remove(id);
};

// Server-only: returns the decrypted API key for a config (validation/translation).
export const getDecryptedApiKey = async (id: number): Promise<string | null> => {
  const config = await store.get(id);
  if (!config?.encryptedApiKey || !config.salt) return null;
  const { decryptApiKey } = await import("./encryption");
  return decryptApiKey(config.encryptedApiKey, config.salt);
};

export const getConfig = async (id: number): Promise<AiConfig | null> => store.get(id);
