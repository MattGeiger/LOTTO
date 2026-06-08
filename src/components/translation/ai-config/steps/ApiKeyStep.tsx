// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.

"use client";

import { toast } from "sonner";

import { LockIcon } from "@/components/animate-ui/icons/lock";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import { StepWrapper } from "../shared/StepWrapper";
import type { ApiKeyConfigData, BaseStepProps } from "../shared/types";
import { validateApiKeyForService } from "../shared/validation";

export function ApiKeyStep({ mode, data, onChange, isLoading = false, onBlur }: BaseStepProps<ApiKeyConfigData>) {
  const handleApiKeyBlur = () => {
    onBlur?.("apiKey", "apikey");
    const result = validateApiKeyForService(data.apiKey, data.serviceType);
    if (result.warning) toast.warning(result.warning);
  };

  return (
    <StepWrapper
      icon={LockIcon}
      title="API Key"
      description={mode === "add" ? "Enter your API credentials" : "API credentials (already configured)"}
    >
      <div className="space-y-2">
        <Label htmlFor="apiKey">API Key</Label>
        {mode === "add" ? (
          <>
            <Input
              id="apiKey"
              type="password"
              autoComplete="new-password"
              value={data.apiKey}
              onChange={(event) => onChange({ apiKey: event.target.value })}
              onBlur={handleApiKeyBlur}
              placeholder="Enter your API key"
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              API keys are encrypted and never displayed. Required for API access.
            </p>
          </>
        ) : (
          <>
            <Input type="password" value="••••••••••••••••" disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground">
              API key is encrypted and cannot be viewed. Enter a new key only if replacing it.
            </p>
            <Input
              type="password"
              autoComplete="new-password"
              value={data.apiKey}
              onChange={(event) => onChange({ apiKey: event.target.value })}
              onBlur={handleApiKeyBlur}
              placeholder="New API key (optional)"
              disabled={isLoading}
            />
          </>
        )}
      </div>

      {mode === "edit" ? (
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Active Status</Label>
            <p className="text-sm text-muted-foreground">Enable or disable this configuration.</p>
          </div>
          <Switch
            checked={data.isActive || false}
            onCheckedChange={(checked) => onChange({ isActive: checked })}
            disabled={isLoading}
          />
        </div>
      ) : null}
    </StepWrapper>
  );
}
