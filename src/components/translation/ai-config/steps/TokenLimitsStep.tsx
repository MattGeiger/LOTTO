// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.

"use client";

import { SettingsIcon } from "@/components/animate-ui/icons/settings";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MAX_TRANSLATION_MAX_OUTPUT_TOKENS } from "@/lib/ai/output-budget";

import { StepWrapper } from "../shared/StepWrapper";
import type { ApiKeyConfigData, BaseStepProps } from "../shared/types";

const intOrNull = (value: string): number | null => {
  if (!value.trim()) return null;
  const parsed = Number(value.replaceAll(",", ""));
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
};

export function TokenLimitsStep({ data, onChange, isLoading = false }: BaseStepProps<ApiKeyConfigData>) {
  return (
    <StepWrapper icon={SettingsIcon} title="Token Limits" description="Review model capability and set LOTTO's translation budget">
      <div className="space-y-2">
        <Label htmlFor="inputTokenLimit">Input Token Limit</Label>
        <Input
          id="inputTokenLimit"
          type="text"
          value={data.inputTokenLimit ?? ""}
          onChange={(event) => onChange({ inputTokenLimit: intOrNull(event.target.value) })}
          placeholder="Maximum input tokens"
          disabled={isLoading}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="outputTokenLimit">Model Output Token Limit</Label>
        <Input
          id="outputTokenLimit"
          type="text"
          value={data.outputTokenLimit ?? ""}
          onChange={(event) => onChange({ outputTokenLimit: intOrNull(event.target.value) })}
          placeholder="Provider capability"
          disabled={isLoading}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="maxTokens">Translation Output Budget Per Request</Label>
        <Input
          id="maxTokens"
          type="text"
          value={data.maxTokens ?? ""}
          onChange={(event) => onChange({ maxTokens: intOrNull(event.target.value) })}
          placeholder="Recommended: 8,192"
          aria-describedby="maxTokensGuidance"
          disabled={isLoading}
        />
        <p id="maxTokensGuidance" className="text-xs text-muted-foreground">
          LOTTO uses up to 8,192 tokens for normal batches and never more than {MAX_TRANSLATION_MAX_OUTPUT_TOKENS.toLocaleString("en-US")} per request.
        </p>
      </div>
    </StepWrapper>
  );
}
