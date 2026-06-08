// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.

"use client";

import { FileTextIcon } from "@/components/ui/file-text";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

import { StepWrapper } from "../shared/StepWrapper";
import type { BaseConfigData, BaseStepProps } from "../shared/types";

export function NameStep<T extends BaseConfigData & { isActive?: boolean }>({
  mode,
  data,
  onChange,
  isLoading = false,
  onBlur,
}: BaseStepProps<T>) {
  return (
    <StepWrapper
      icon={FileTextIcon}
      title="Name & Description"
      description={mode === "add" ? "Name your configuration and add details" : "Update configuration name and details"}
    >
      <div className="space-y-2">
        <Label htmlFor="name">Configuration Name</Label>
        <Input
          id="name"
          value={data.name || ""}
          onChange={(event) => onChange({ name: event.target.value } as Partial<T>)}
          onBlur={() => onBlur?.("name", "name")}
          placeholder="Configuration name (3-100 characters)"
          maxLength={100}
          disabled={isLoading}
        />
        <div className="flex justify-between">
          <p className="text-xs text-muted-foreground">Unique identifier for this configuration.</p>
          <p className="text-xs text-muted-foreground">{(data.name || "").length}/100 characters</p>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description (Optional)</Label>
        <Textarea
          id="description"
          value={data.description || ""}
          onChange={(event) => onChange({ description: event.target.value } as Partial<T>)}
          placeholder="Optional notes about this configuration"
          rows={2}
          maxLength={500}
          disabled={isLoading}
        />
        <div className="flex justify-between">
          <p className="text-xs text-muted-foreground">Additional context or usage notes.</p>
          <p className="text-xs text-muted-foreground">{(data.description || "").length}/500 characters</p>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label>Active Status</Label>
          <p className="text-sm text-muted-foreground">Enable or disable this configuration.</p>
        </div>
        <Switch
          checked={data.isActive ?? true}
          onCheckedChange={(checked) => onChange({ isActive: checked } as Partial<T>)}
          disabled={isLoading}
        />
      </div>
    </StepWrapper>
  );
}
