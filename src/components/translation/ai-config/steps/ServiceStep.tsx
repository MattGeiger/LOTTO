// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

"use client";

import { BotIcon } from "@/components/animate-ui/icons/bot";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CUSTOM_MODEL,
  getModelNames,
  getModelSpec,
  getModelSpecsForService,
  getServiceEndpoint,
} from "@/lib/ai/model-specs";
import type { AiServiceType } from "@/lib/ai/types";
import { recommendedTranslationOutputBudget } from "@/lib/ai/output-budget";

import { StepWrapper } from "../shared/StepWrapper";
import type { ApiKeyConfigData, BaseStepProps } from "../shared/types";

const applyModelSpecs = (
  modelName: string,
  serviceType: AiServiceType,
): Partial<ApiKeyConfigData> => {
  if (modelName === CUSTOM_MODEL) return {};
  const spec = getModelSpec(modelName, serviceType);
  if (!spec) return {};
  return {
    model: spec.model,
    inputCost: spec.inputPrice,
    outputCost: spec.outputPrice,
    unitPrice: "per_1m",
    inputTokenLimit: spec.inputTokenLimit,
    outputTokenLimit: spec.outputTokenLimit,
    maxTokens: recommendedTranslationOutputBudget(spec.outputTokenLimit),
  };
};

export function ServiceStep({ mode, data, onChange, isLoading = false }: BaseStepProps<ApiKeyConfigData>) {
  const handleServiceTypeChange = (serviceType: AiServiceType) => {
    const first = getModelSpecsForService(serviceType)[0];
    onChange({
      serviceType,
      modelName: first?.name ?? CUSTOM_MODEL,
      model: first?.model ?? "",
      customModelName: "",
      customModel: "",
      endpointUrl: getServiceEndpoint(serviceType),
      ...((first && applyModelSpecs(first.name, serviceType)) || {}),
    });
  };

  const handleModelNameChange = (modelName: string) => {
    if (modelName === CUSTOM_MODEL) {
      onChange({ modelName, model: CUSTOM_MODEL, customModel: "", customModelName: "" });
      return;
    }
    onChange({ modelName, ...applyModelSpecs(modelName, data.serviceType) });
  };

  return (
    <StepWrapper icon={BotIcon} title="Service Configuration" description="Configure the AI service and model settings">
      <div className="space-y-2">
        <Label htmlFor="serviceType">Service Type</Label>
        {mode === "edit" ? (
          <>
            <Input value={data.serviceType} disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground">Service type cannot be changed when editing.</p>
          </>
        ) : (
          <Select value={data.serviceType} onValueChange={(value) => handleServiceTypeChange(value as AiServiceType)}>
            <SelectTrigger id="serviceType">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Anthropic">Anthropic</SelectItem>
              <SelectItem value="Google">Google (Default)</SelectItem>
              <SelectItem value="OpenAI">OpenAI</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="modelName">Model Name</Label>
        <Select value={data.modelName} onValueChange={handleModelNameChange}>
          <SelectTrigger id="modelName">
            <SelectValue placeholder="Select model name" />
          </SelectTrigger>
          <SelectContent>
            {getModelNames(data.serviceType).map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {data.modelName === CUSTOM_MODEL ? (
          <Input
            value={data.customModelName}
            onChange={(event) => onChange({ customModelName: event.target.value })}
            placeholder="Enter custom model name"
            disabled={isLoading}
            className="mt-2"
          />
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="model">Model ID</Label>
        {data.modelName === CUSTOM_MODEL ? (
          <Input
            id="model"
            value={data.customModel}
            onChange={(event) => onChange({ customModel: event.target.value, model: event.target.value })}
            placeholder="Enter custom model id"
            disabled={isLoading}
          />
        ) : (
          <>
            <Input id="model" value={data.model} disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground">
              Cost and token limits are pre-filled from this model&apos;s template.
            </p>
          </>
        )}
      </div>
    </StepWrapper>
  );
}
