// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

"use client";

import * as React from "react";

import { getModelSpecByModel, getServiceEndpoint, GOOGLE_MODEL_SPECS } from "@/lib/ai/model-specs";
import type { AiConfigInput, AiConfigPublic } from "@/lib/ai/types";

import { BaseAIConfigDialog } from "./shared/BaseAIConfigDialog";
import { createApiKeySteps } from "./shared/stepDefinitions";
import type { ApiKeyConfigData } from "./shared/types";

export type AiConfigDialogMode = "add" | "edit";

const defaultGoogleSpec = GOOGLE_MODEL_SPECS.find((spec) => spec.name === "gemini-2.5-flash-lite") ?? GOOGLE_MODEL_SPECS[0];

const initialData = (): ApiKeyConfigData => ({
  type: "apikey",
  serviceType: "Google",
  model: defaultGoogleSpec?.model ?? "gemini-2.5-flash-lite",
  modelName: defaultGoogleSpec?.name ?? "gemini-2.5-flash-lite",
  customModel: "",
  customModelName: "",
  apiKey: "",
  endpointUrl: getServiceEndpoint("Google"),
  inputCost: defaultGoogleSpec?.inputPrice,
  outputCost: defaultGoogleSpec?.outputPrice,
  unitPrice: "per_1m",
  inputTokenLimit: defaultGoogleSpec?.inputTokenLimit,
  outputTokenLimit: defaultGoogleSpec?.outputTokenLimit,
  maxTokens: defaultGoogleSpec?.outputTokenLimit,
  name: "",
  description: "",
  value: "",
  temperature: 0.7,
  topP: 1,
  thinkingLevel: "high",
  isActive: true,
});

const fromConfig = (config: AiConfigPublic): Partial<ApiKeyConfigData> => {
  const spec = getModelSpecByModel(config.model);
  return {
    name: config.name,
    serviceType: config.serviceType,
    modelName: spec?.name ?? "Custom",
    model: spec?.model ?? config.model,
    customModelName: spec ? "" : config.model,
    customModel: spec ? "" : config.model,
    apiKey: "",
    endpointUrl: getServiceEndpoint(config.serviceType),
    inputCost: config.inputCost,
    outputCost: config.outputCost,
    unitPrice: config.unitPrice,
    inputTokenLimit: config.inputTokenLimit,
    outputTokenLimit: config.outputTokenLimit,
    maxTokens: config.maxTokens,
    temperature: config.temperature ?? 0.7,
    topP: config.topP ?? 1,
    thinkingLevel: (config.thinkingLevel as ApiKeyConfigData["thinkingLevel"]) ?? "high",
    isActive: config.isActive,
  };
};

export function AiConfigDialog({
  open,
  onOpenChange,
  mode,
  config,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: AiConfigDialogMode;
  config?: AiConfigPublic | null;
  onSave: (input: AiConfigInput) => Promise<boolean>;
}) {
  const baseData = React.useMemo(() => initialData(), []);
  const existingData = React.useMemo(() => (mode === "edit" && config ? fromConfig(config) : undefined), [config, mode]);

  const handleSave = React.useCallback(
    async (data: ApiKeyConfigData): Promise<boolean> => {
      const modelName = data.modelName === "Custom" ? data.customModelName : data.modelName;
      void modelName;
      const model = data.modelName === "Custom" ? data.customModel : data.model;
      return onSave({
        name: data.name.trim(),
        serviceType: data.serviceType,
        model: model.trim(),
        ...(data.apiKey.trim() ? { apiKey: data.apiKey.trim() } : {}),
        inputCost: data.inputCost ?? 0,
        outputCost: data.outputCost ?? 0,
        unitPrice: data.unitPrice,
        inputTokenLimit: data.inputTokenLimit ?? null,
        outputTokenLimit: data.outputTokenLimit ?? null,
        maxTokens: data.maxTokens ?? null,
        temperature: data.temperature,
        topP: data.topP,
        thinkingLevel: data.thinkingLevel ?? null,
        isActive: data.isActive ?? true,
      });
    },
    [onSave],
  );

  return (
    <BaseAIConfigDialog<ApiKeyConfigData>
      open={open}
      onOpenChange={onOpenChange}
      mode={mode}
      title="AI Model Configuration"
      getSteps={() => createApiKeySteps(mode)}
      initialData={baseData}
      existingData={existingData}
      onSave={handleSave}
    />
  );
}
