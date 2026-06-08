// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

"use client";

import * as React from "react";

import type { PromptType, SystemPrompt, SystemPromptInput } from "@/lib/ai/system-prompt-types";

import { BaseAIConfigDialog } from "./shared/BaseAIConfigDialog";
import { createSystemPromptSteps, getFilteredPromptSteps } from "./shared/stepDefinitions";
import type { PromptConfigData } from "./shared/types";

export type SystemPromptDialogMode = "add" | "edit";

const initialData = (): PromptConfigData => ({
  type: "prompt",
  name: "",
  description: "",
  temperature: 0.7,
  topP: 1,
  promptCategory: "",
  serviceDescription: "",
  translationApproach: "",
  contextGuidance: "",
  additionalGuidance: "",
  value: "",
  isActive: true,
});

const promptCategoryToType = (category: PromptConfigData["promptCategory"]): PromptType =>
  category === "inventory_translation"
    ? "INVENTORY_TRANSLATION"
    : category === "announcement_translation"
      ? "ANNOUNCEMENT_TRANSLATION"
      : "UI_TRANSLATION";

const promptTypeToCategory = (promptType: PromptType): PromptConfigData["promptCategory"] =>
  promptType === "INVENTORY_TRANSLATION"
    ? "inventory_translation"
    : promptType === "ANNOUNCEMENT_TRANSLATION"
      ? "announcement_translation"
      : "ui_translation";

const fromPrompt = (prompt: SystemPrompt): Partial<PromptConfigData> => ({
  name: prompt.name,
  description: prompt.description ?? "",
  temperature: prompt.temperature ?? 0.7,
  topP: prompt.topP ?? 1,
  promptCategory: promptTypeToCategory(prompt.promptType),
  serviceDescription: prompt.description ?? "",
  translationApproach: prompt.translationApproach ?? "",
  contextGuidance: prompt.contextGuidance ?? "",
  additionalGuidance: prompt.additionalGuidance ?? "",
  isActive: prompt.isActive,
});

export function SystemPromptDialog({
  open,
  onOpenChange,
  mode,
  prompt,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: SystemPromptDialogMode;
  prompt?: SystemPrompt | null;
  onSave: (input: SystemPromptInput) => Promise<boolean>;
}) {
  const baseData = React.useMemo(() => initialData(), []);
  const existingData = React.useMemo(() => (mode === "edit" && prompt ? fromPrompt(prompt) : undefined), [mode, prompt]);

  const handleSave = React.useCallback(
    async (data: PromptConfigData): Promise<boolean> =>
      onSave({
        name: data.name.trim(),
        promptType: promptCategoryToType(data.promptCategory),
        isActive: data.isActive ?? true,
        isDefault: false,
        description: data.serviceDescription.trim() || data.description.trim() || null,
        translationApproach: data.translationApproach.trim() || null,
        contextGuidance: data.contextGuidance.trim() || null,
        additionalGuidance: data.additionalGuidance.trim() || null,
        temperature: data.temperature,
        topP: data.topP,
      }),
    [onSave],
  );

  const getStepsForCategory = React.useCallback((data: PromptConfigData) => {
    const steps = createSystemPromptSteps(mode);
    if (!data.promptCategory) return steps;
    return getFilteredPromptSteps(steps, data.promptCategory);
  }, [mode]);

  return (
    <BaseAIConfigDialog<PromptConfigData>
      open={open}
      onOpenChange={onOpenChange}
      mode={mode}
      title="System Prompt"
      getSteps={getStepsForCategory}
      initialData={baseData}
      existingData={existingData}
      onSave={handleSave}
    />
  );
}
