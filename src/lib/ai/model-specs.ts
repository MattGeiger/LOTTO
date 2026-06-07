// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

// Pre-baked model configuration templates, ported from FEED's model-specs.ts.
// Selecting a model in the AI configuration wizard auto-fills cost and token
// limits from these specs (prices are USD per 1M tokens). Legacy/sunset models
// from FEED are omitted; "Custom" lets staff enter any model id by hand.

import type { AiServiceType } from "./types";

export type ModelSpec = {
  /** Friendly name shown in the dropdown, e.g. "claude-sonnet-4.5". */
  name: string;
  /** API model id sent to the provider, e.g. "claude-sonnet-4-5-20250929". */
  model: string;
  /** USD price per 1M input tokens. */
  inputPrice: number;
  /** USD price per 1M output tokens. */
  outputPrice: number;
  inputTokenLimit: number;
  outputTokenLimit?: number;
};

export const SERVICE_ENDPOINTS: Record<AiServiceType, string> = {
  OpenAI: "https://api.openai.com/v1",
  Anthropic: "https://api.anthropic.com/v1",
  Google: "https://generativelanguage.googleapis.com",
};

export const OPENAI_MODEL_SPECS: ModelSpec[] = [
  { name: "gpt-5-nano", model: "gpt-5-nano-2025-08-07", inputPrice: 0.05, outputPrice: 0.4, inputTokenLimit: 128000, outputTokenLimit: 128000 },
  { name: "gpt-5-mini", model: "gpt-5-mini-2025-08-07", inputPrice: 0.25, outputPrice: 2.0, inputTokenLimit: 128000, outputTokenLimit: 128000 },
  { name: "gpt-5", model: "gpt-5-2025-08-07", inputPrice: 1.25, outputPrice: 10.0, inputTokenLimit: 128000, outputTokenLimit: 128000 },
  { name: "gpt-4.1-nano", model: "gpt-4.1-nano-2025-04-14", inputPrice: 0.1, outputPrice: 0.4, inputTokenLimit: 1047576, outputTokenLimit: 32768 },
  { name: "gpt-4.1-mini", model: "gpt-4.1-mini-2025-04-14", inputPrice: 0.4, outputPrice: 1.6, inputTokenLimit: 1047576, outputTokenLimit: 32768 },
  { name: "gpt-4.1", model: "gpt-4.1-2025-04-14", inputPrice: 2.0, outputPrice: 8.0, inputTokenLimit: 1047576, outputTokenLimit: 32768 },
  { name: "gpt-4o-mini", model: "gpt-4o-mini-2024-07-18", inputPrice: 0.15, outputPrice: 0.6, inputTokenLimit: 131072, outputTokenLimit: 16384 },
  { name: "gpt-4o", model: "gpt-4o-2024-05-13", inputPrice: 5.0, outputPrice: 20.0, inputTokenLimit: 131072, outputTokenLimit: 16384 },
];

export const ANTHROPIC_MODEL_SPECS: ModelSpec[] = [
  { name: "claude-haiku-4.5", model: "claude-haiku-4-5-20251001", inputPrice: 1.0, outputPrice: 5.0, inputTokenLimit: 200000, outputTokenLimit: 64000 },
  { name: "claude-sonnet-4.5", model: "claude-sonnet-4-5-20250929", inputPrice: 3.0, outputPrice: 15.0, inputTokenLimit: 200000, outputTokenLimit: 64000 },
  { name: "claude-opus-4.5", model: "claude-opus-4-5-20251101", inputPrice: 5.0, outputPrice: 25.0, inputTokenLimit: 200000, outputTokenLimit: 64000 },
];

export const GOOGLE_MODEL_SPECS: ModelSpec[] = [
  { name: "gemini-2.5-flash-lite", model: "gemini-2.5-flash-lite", inputPrice: 0.1, outputPrice: 0.4, inputTokenLimit: 1048576, outputTokenLimit: 65536 },
  { name: "gemini-2.5-flash", model: "gemini-2.5-flash", inputPrice: 0.3, outputPrice: 2.5, inputTokenLimit: 1048576, outputTokenLimit: 65536 },
  { name: "gemini-2.5-pro", model: "gemini-2.5-pro", inputPrice: 1.25, outputPrice: 10.0, inputTokenLimit: 1048576, outputTokenLimit: 65536 },
  { name: "gemini-3-flash-preview", model: "gemini-3-flash-preview", inputPrice: 0.5, outputPrice: 3.0, inputTokenLimit: 1048576, outputTokenLimit: 65536 },
  { name: "gemini-3-pro-preview", model: "gemini-3-pro-preview", inputPrice: 2.0, outputPrice: 12.0, inputTokenLimit: 1048576, outputTokenLimit: 65536 },
];

export const CUSTOM_MODEL = "Custom";

const SPECS_BY_SERVICE: Record<AiServiceType, ModelSpec[]> = {
  OpenAI: OPENAI_MODEL_SPECS,
  Anthropic: ANTHROPIC_MODEL_SPECS,
  Google: GOOGLE_MODEL_SPECS,
};

export const getModelSpecsForService = (serviceType: AiServiceType): ModelSpec[] =>
  SPECS_BY_SERVICE[serviceType] ?? [];

/** Friendly model names for a service, with "Custom" appended. */
export const getModelNames = (serviceType: AiServiceType): string[] => [
  ...getModelSpecsForService(serviceType).map((spec) => spec.name),
  CUSTOM_MODEL,
];

export const getModelSpec = (
  modelName: string,
  serviceType: AiServiceType,
): ModelSpec | undefined => getModelSpecsForService(serviceType).find((spec) => spec.name === modelName);

/** Find a spec by its API model id (for editing existing configs). */
export const getModelSpecByModel = (model: string): ModelSpec | undefined => {
  const all = [...OPENAI_MODEL_SPECS, ...ANTHROPIC_MODEL_SPECS, ...GOOGLE_MODEL_SPECS];
  return all.find((spec) => spec.model === model);
};

export const getServiceEndpoint = (serviceType: AiServiceType): string =>
  SERVICE_ENDPOINTS[serviceType] ?? "";
