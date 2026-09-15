// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

// Compatibility API for the existing six-step wizard. All model facts come
// from the FEED-derived catalogue; historical entries resolve when editing.
import { CATALOGUE, DEFAULT_MODEL_ID, findCatalogueEntry, selectableEntries, type CatalogueEntry } from "./catalogue";
import type { AiServiceType } from "./types";
export { SERVICE_ENDPOINTS } from "./catalogue";
import { SERVICE_ENDPOINTS } from "./catalogue";

export type ModelSpec = {
  name: string;
  model: string;
  inputPrice: number;
  outputPrice: number;
  inputTokenLimit: number;
  outputTokenLimit?: number;
};

const toSpec = (entry: CatalogueEntry): ModelSpec => ({
  name: entry.displayName,
  model: entry.id,
  inputPrice: entry.pricing.input,
  outputPrice: entry.pricing.output,
  inputTokenLimit: entry.contextWindow,
  outputTokenLimit: entry.maxOutputTokens,
});

export const CUSTOM_MODEL = "Custom";
export const getModelSpecsForService = (service: AiServiceType): ModelSpec[] =>
  selectableEntries().filter((entry) => entry.provider === service).map(toSpec);
export const OPENAI_MODEL_SPECS = getModelSpecsForService("OpenAI");
export const ANTHROPIC_MODEL_SPECS = getModelSpecsForService("Anthropic");
export const GOOGLE_MODEL_SPECS = getModelSpecsForService("Google");
export const DEFAULT_MODEL_SPEC = toSpec(findCatalogueEntry(DEFAULT_MODEL_ID)!);

export const getModelNames = (service: AiServiceType): string[] => [
  ...getModelSpecsForService(service).map((spec) => spec.name), CUSTOM_MODEL,
];
export const getModelSpec = (name: string, service: AiServiceType): ModelSpec | undefined => {
  const entry = CATALOGUE.find((entry) => entry.provider === service && entry.displayName === name);
  return entry ? toSpec(entry) : undefined;
};
export const getModelSpecByModel = (model: string): ModelSpec | undefined => {
  const entry = findCatalogueEntry(model);
  return entry ? toSpec(entry) : undefined;
};
export const getServiceEndpoint = (service: AiServiceType): string => SERVICE_ENDPOINTS[service];
