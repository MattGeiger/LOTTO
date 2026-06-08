// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

import type { ComponentType } from "react";

import type { AiServiceType, UnitPrice } from "@/lib/ai/types";

export type StepMode = "add" | "edit";
export type ValidationType = "required" | "model" | "apikey" | "url" | "name" | "prompt";

export interface BaseConfigData {
  name: string;
  description: string;
  temperature: number;
  topP: number;
  thinkingLevel?: "minimal" | "low" | "medium" | "high" | null;
}

export interface ApiKeyConfigData extends BaseConfigData {
  type: "apikey";
  serviceType: AiServiceType;
  model: string;
  modelName: string;
  customModel: string;
  customModelName: string;
  apiKey: string;
  endpointUrl: string;
  inputCost: number | null | undefined;
  outputCost: number | null | undefined;
  unitPrice: UnitPrice;
  inputTokenLimit: number | null | undefined;
  outputTokenLimit: number | null | undefined;
  maxTokens: number | null | undefined;
  value: string;
  isActive?: boolean;
}

export interface PromptConfigData extends BaseConfigData {
  type: "prompt";
  promptCategory: "" | "ui_translation" | "inventory_translation" | "announcement_translation";
  serviceDescription: string;
  translationApproach: string;
  contextGuidance: string;
  additionalGuidance: string;
  value: string;
  isActive?: boolean;
}

export type ConfigData = ApiKeyConfigData | PromptConfigData;

export interface ValidationState {
  showValidation: boolean;
  errors: Partial<Record<keyof ApiKeyConfigData | keyof PromptConfigData, string>>;
}

export interface BaseStepProps<T extends ConfigData | BaseConfigData = ConfigData> {
  mode: StepMode;
  data: T;
  onChange: (data: Partial<T>) => void;
  animateIntro?: boolean;
  isLoading?: boolean;
  validation?: ValidationState;
  onBlur?: (field: keyof T, type?: ValidationType) => void;
}

export type StepDefinition<T extends ConfigData> = {
  id: string;
  title: string;
  description: string;
  component: ComponentType<BaseStepProps<T>>;
  validate?: (data: T) => boolean;
  isOptional?: boolean;
};

export interface BaseDialogProps<T extends ConfigData> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: StepMode;
  title: string;
  getSteps: (data: T) => StepDefinition<T>[];
  initialData: T;
  onSave: (data: T) => Promise<boolean>;
  isLoading?: boolean;
  existingData?: Partial<T>;
}

export interface PromptCategory {
  id: PromptConfigData["promptCategory"];
  name: string;
  description: string;
  icon: ComponentType<{ className?: string; size?: number }>;
}
