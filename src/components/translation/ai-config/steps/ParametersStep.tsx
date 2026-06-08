// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.

"use client";

import { SlidersVerticalIcon } from "@/components/animate-ui/icons/sliders-vertical";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

import { StepWrapper } from "../shared/StepWrapper";
import type { BaseStepProps, ConfigData } from "../shared/types";

export function ParametersStep<T extends ConfigData>({ data, onChange, isLoading = false }: BaseStepProps<T>) {
  return (
    <StepWrapper
      icon={SlidersVerticalIcon}
      title="AI Parameters"
      description="Configure AI behavior and response characteristics"
    >
      <div className="space-y-2">
        <Label htmlFor="temperature">Temperature (Creativity)</Label>
        <div className="px-3">
          <Slider
            id="temperature"
            value={[data.temperature || 0.7]}
            onValueChange={([value]) => onChange({ temperature: value } as Partial<T>)}
            min={0}
            max={2}
            step={0.1}
            className="w-full"
            disabled={isLoading}
          />
          <div className="mt-1 flex justify-between text-xs text-muted-foreground">
            <span>0.0 (Focused)</span>
            <span className="font-medium">{data.temperature || 0.7}</span>
            <span>2.0 (Creative)</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Lower values = more focused and deterministic, higher values = more creative and random.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="topP">Top-p (Response Diversity)</Label>
        <div className="px-3">
          <Slider
            id="topP"
            value={[data.topP || 1]}
            onValueChange={([value]) => onChange({ topP: value } as Partial<T>)}
            min={0}
            max={1}
            step={0.1}
            className="w-full"
            disabled={isLoading}
          />
          <div className="mt-1 flex justify-between text-xs text-muted-foreground">
            <span>0.0 (Narrow)</span>
            <span className="font-medium">{data.topP || 1}</span>
            <span>1.0 (Full)</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Lower values = narrower vocabulary selection, higher values = full vocabulary range.
        </p>
      </div>
    </StepWrapper>
  );
}
