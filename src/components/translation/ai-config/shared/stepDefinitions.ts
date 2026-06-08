// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.

import { ApiKeyStep } from "../steps/ApiKeyStep";
import { CostStep } from "../steps/CostStep";
import { NameStep } from "../steps/NameStep";
import { ParametersStep } from "../steps/ParametersStep";
import { PromptCategoryStep } from "../steps/PromptCategoryStep";
import { ServiceStep } from "../steps/ServiceStep";
import { TabbedPromptConfigStep } from "../steps/TabbedPromptConfigStep";
import { TokenLimitsStep } from "../steps/TokenLimitsStep";
import type { ApiKeyConfigData, PromptConfigData, StepDefinition } from "./types";
import { validateApiKey } from "./validation";

export const createApiKeySteps = (mode: "add" | "edit"): StepDefinition<ApiKeyConfigData>[] => [
  {
    id: "service",
    title: "Service Configuration",
    description: "Configure the AI service and model settings",
    component: ServiceStep,
    validate: (data) => {
      const effectiveModel = data.modelName === "Custom" ? data.customModel : data.model;
      const effectiveModelName = data.modelName === "Custom" ? data.customModelName : data.modelName;
      return Boolean(data.serviceType && effectiveModel.trim() && effectiveModelName.trim());
    },
  },
  {
    id: "apikey",
    title: "API Credentials",
    description: mode === "add" ? "Enter API credentials and endpoint" : "API credentials (already configured)",
    component: ApiKeyStep,
    validate: (data) => {
      if (mode === "edit") return true;
      const apiKeyResult = validateApiKey(data.apiKey);
      return !apiKeyResult.error && data.apiKey.trim().length > 0;
    },
  },
  {
    id: "cost",
    title: "Cost Tracking",
    description: mode === "add" ? "Set cost tracking parameters" : "Update cost tracking parameters",
    component: CostStep,
    isOptional: true,
  },
  {
    id: "tokenlimits",
    title: "Token Limits",
    description: "Configure input and output token limits",
    component: TokenLimitsStep,
    isOptional: true,
  },
  {
    id: "parameters",
    title: "AI Parameters",
    description: "Configure AI behavior parameters",
    component: ParametersStep,
    isOptional: true,
  },
  {
    id: "name",
    title: "Configuration Details",
    description: mode === "add" ? "Name your configuration and add details" : "Update configuration name and details",
    component: NameStep,
    validate: (data) => data.name.trim().length >= 3,
  },
];

export const createSystemPromptSteps = (_mode: "add" | "edit"): StepDefinition<PromptConfigData>[] => {
  void _mode;
  return [
  {
    id: "promptcategory",
    title: "Prompt Category",
    description: "Select the category that best fits your prompt purpose",
    component: PromptCategoryStep,
    validate: (data) => Boolean(data.promptCategory),
  },
  {
    id: "configuration",
    title: "Translation Customization",
    description: "Customize your translation prompt with specific guidance",
    component: TabbedPromptConfigStep,
    validate: (data) =>
      Boolean(
        data.serviceDescription.trim() ||
          data.translationApproach.trim() ||
          data.contextGuidance.trim() ||
          data.additionalGuidance.trim(),
      ),
  },
  {
    id: "parameters",
    title: "AI Parameters",
    description: "Configure AI behavior parameters",
    component: ParametersStep,
    isOptional: true,
  },
  {
    id: "name",
    title: "Configuration Details",
    description: "Name your prompt and add details",
    component: NameStep,
    validate: (data) => data.name.trim().length >= 3,
  },
  ];
};

export const getFilteredPromptSteps = (
  steps: StepDefinition<PromptConfigData>[],
  _promptCategory: PromptConfigData["promptCategory"],
): StepDefinition<PromptConfigData>[] => {
  void _promptCategory;
  return steps;
};
