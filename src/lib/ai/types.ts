// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

export const AI_SERVICE_TYPES = ["OpenAI", "Anthropic", "Google"] as const;
export type AiServiceType = (typeof AI_SERVICE_TYPES)[number];

export const UNIT_PRICES = ["per_1m", "per_1k"] as const;
export type UnitPrice = (typeof UNIT_PRICES)[number];

// Full record as persisted (includes secrets; never sent to the client).
export type AiConfig = {
  id: number;
  name: string;
  serviceType: AiServiceType;
  model: string;
  encryptedApiKey: string | null;
  salt: string | null;
  inputCost: number;
  outputCost: number;
  unitPrice: UnitPrice;
  temperature: number | null;
  topP: number | null;
  thinkingLevel: string | null;
  maxTokens: number | null;
  inputTokenLimit: number | null;
  outputTokenLimit: number | null;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
};

// Client-safe view: no encrypted key / salt; exposes only whether a key is set.
export type AiConfigPublic = Omit<AiConfig, "encryptedApiKey" | "salt"> & {
  hasApiKey: boolean;
};

// Fields accepted when creating/updating a config. `apiKey` is plaintext on the
// wire (HTTPS) and encrypted at rest; omit it on update to keep the existing key.
export type AiConfigInput = {
  name: string;
  serviceType: AiServiceType;
  model: string;
  apiKey?: string;
  inputCost?: number;
  outputCost?: number;
  unitPrice?: UnitPrice;
  temperature?: number | null;
  topP?: number | null;
  thinkingLevel?: string | null;
  maxTokens?: number | null;
  inputTokenLimit?: number | null;
  outputTokenLimit?: number | null;
  isActive?: boolean;
};

export const toPublicConfig = (config: AiConfig): AiConfigPublic => {
  const { encryptedApiKey, salt, ...rest } = config;
  void salt;
  return { ...rest, hasApiKey: Boolean(encryptedApiKey) };
};
