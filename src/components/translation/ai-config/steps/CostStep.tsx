// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.

"use client";

import { SettingsIcon } from "@/components/animate-ui/icons/settings";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { StepWrapper } from "../shared/StepWrapper";
import type { ApiKeyConfigData, BaseStepProps } from "../shared/types";

const num = (value: string): number | null => {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export function CostStep({ data, onChange, isLoading = false }: BaseStepProps<ApiKeyConfigData>) {
  return (
    <StepWrapper icon={SettingsIcon} title="Cost Tracking" description="Set pricing information for cost calculations">
      <div className="space-y-2">
        <Label htmlFor="unitPrice">Unit Price</Label>
        <Select value={data.unitPrice || "per_1m"} onValueChange={(value) => onChange({ unitPrice: value as "per_1m" | "per_1k" })}>
          <SelectTrigger id="unitPrice">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="per_1k">Per 1K tokens</SelectItem>
            <SelectItem value="per_1m">Per 1M tokens</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="inputCost">Input Rate</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
          <Input
            id="inputCost"
            type="text"
            value={data.inputCost ?? ""}
            onChange={(event) => onChange({ inputCost: num(event.target.value) })}
            placeholder="Cost per unit"
            className="pl-8"
            disabled={isLoading}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="outputCost">Output Rate</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
          <Input
            id="outputCost"
            type="text"
            value={data.outputCost ?? ""}
            onChange={(event) => onChange({ outputCost: num(event.target.value) })}
            placeholder="Cost per unit"
            className="pl-8"
            disabled={isLoading}
          />
        </div>
      </div>
    </StepWrapper>
  );
}
