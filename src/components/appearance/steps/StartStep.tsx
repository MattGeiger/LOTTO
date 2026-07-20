// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. Agency branding is not covered
// by this license; see TRADEMARKS.md.

"use client";

import * as React from "react";
import { Check } from "lucide-react";

import { SparklesIcon } from "@/components/animate-ui/icons/sparkles";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StepWrapper } from "@/components/translation/ai-config/shared/StepWrapper";
import { cn } from "@/lib/utils";
import type { BrandConfig } from "@/lib/brand-theme/config-schema";

import { scratchConfig, slugifyConfigId } from "../draft";
import type { AppearanceStepProps, TemplateOption } from "../types";

function StartChoice({
  title,
  description,
  selected,
  onSelect,
  disabled,
}: {
  title: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        "w-full rounded-lg border p-3 text-left transition-colors",
        selected
          ? "border-primary bg-primary/5 ring-1 ring-primary"
          : "border-border hover:bg-muted/50",
      )}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="font-medium">{title}</span>
        {selected ? <Check className="h-4 w-4 text-primary" aria-hidden /> : null}
      </span>
      <span className="mt-1 block text-sm text-muted-foreground">{description}</span>
    </button>
  );
}

export function StartStep({
  draft,
  onChange,
  templates,
  isLoading,
  animateIntro,
}: AppearanceStepProps) {
  const applySource = (sourceId: string, config: BrandConfig) => {
    onChange({
      startSource: sourceId,
      config: structuredClone(config),
    });
  };

  return (
    <StepWrapper
      icon={SparklesIcon}
      title="Set up your appearance"
      description="Start from an example brand or from a neutral blank slate. Everything can be changed in the next steps."
      animateIntro={animateIntro}
    >
      <div className="space-y-2">
        {templates.map((template: TemplateOption) => (
          <StartChoice
            key={template.id}
            title={template.name}
            description={template.description}
            selected={draft.startSource === template.id}
            onSelect={() => applySource(template.id, template.config)}
            disabled={isLoading}
          />
        ))}
        <StartChoice
          title="Start from scratch"
          description="Neutral colors and placeholder graphics, ready for your own brand."
          selected={draft.startSource === "scratch"}
          onSelect={() => applySource("scratch", scratchConfig())}
          disabled={isLoading}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="appearance-config-id">Configuration name</Label>
        <Input
          id="appearance-config-id"
          value={draft.id}
          onChange={(event) => onChange({ id: slugifyConfigId(event.target.value) })}
          placeholder="my-organization"
          maxLength={64}
          disabled={isLoading}
          spellCheck={false}
        />
        <p className="text-xs text-muted-foreground">
          Lowercase letters, numbers, and dashes. Saving with an existing name
          updates that configuration.
        </p>
      </div>
    </StepWrapper>
  );
}
