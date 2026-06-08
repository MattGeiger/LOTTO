// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

export const PROMPT_TYPES = ["UI_TRANSLATION", "INVENTORY_TRANSLATION", "ANNOUNCEMENT_TRANSLATION"] as const;
export type PromptType = (typeof PROMPT_TYPES)[number];

export type SystemPrompt = {
  id: number;
  name: string;
  promptType: PromptType;
  isActive: boolean;
  isDefault: boolean;
  description: string | null;
  translationApproach: string | null;
  contextGuidance: string | null;
  additionalGuidance: string | null;
  temperature: number | null;
  topP: number | null;
  createdAt: number;
  updatedAt: number;
};

export type SystemPromptInput = {
  name: string;
  promptType: PromptType;
  isActive?: boolean;
  isDefault?: boolean;
  description?: string | null;
  translationApproach?: string | null;
  contextGuidance?: string | null;
  additionalGuidance?: string | null;
  temperature?: number | null;
  topP?: number | null;
};

export const toPromptConfiguration = (prompt: SystemPrompt) => ({
  id: `prompt:${prompt.id}`,
  originalId: prompt.id,
  configType: "prompt" as const,
  name: prompt.name,
  serviceType: "Prompt" as const,
  model: prompt.promptType,
  inputCost: 0,
  outputCost: 0,
  unitPrice: "per_1m" as const,
  temperature: prompt.temperature,
  topP: prompt.topP,
  thinkingLevel: null,
  maxTokens: null,
  inputTokenLimit: null,
  outputTokenLimit: null,
  isActive: prompt.isActive,
  createdAt: prompt.createdAt,
  updatedAt: prompt.updatedAt,
  hasApiKey: false,
});
