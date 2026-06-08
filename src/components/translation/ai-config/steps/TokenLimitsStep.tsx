// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.

"use client";

import { SettingsIcon } from "@/components/animate-ui/icons/settings";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { StepWrapper } from "../shared/StepWrapper";
import type { ApiKeyConfigData, BaseStepProps } from "../shared/types";

const intOrNull = (value: string): number | null => {
  if (!value.trim()) return null;
  const parsed = Number(value.replaceAll(",", ""));
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
};

export function TokenLimitsStep({ data, onChange, isLoading = false }: BaseStepProps<ApiKeyConfigData>) {
  return (
    <StepWrapper icon={SettingsIcon} title="Token Limits" description="Configure input and output token limits">
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
        <Label htmlFor="outputTokenLimit">Output Token Limit</Label>
        <Input
          id="outputTokenLimit"
          type="text"
          value={data.outputTokenLimit ?? ""}
          onChange={(event) => onChange({ outputTokenLimit: intOrNull(event.target.value), maxTokens: intOrNull(event.target.value) })}
          placeholder="Maximum output tokens"
          disabled={isLoading}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="maxTokens">Max Output Tokens Per Request</Label>
        <Input
          id="maxTokens"
          type="text"
          value={data.maxTokens ?? ""}
          onChange={(event) => onChange({ maxTokens: intOrNull(event.target.value) })}
          placeholder="Provider max output tokens"
          disabled={isLoading}
        />
      </div>
    </StepWrapper>
  );
}
