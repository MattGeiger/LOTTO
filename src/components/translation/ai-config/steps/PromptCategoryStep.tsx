// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.

"use client";

import * as React from "react";

import { AnimateIcon } from "@/components/animate-ui/icons/icon";
import { MessageSquareQuoteIcon } from "@/components/animate-ui/icons/message-square-quote";
import { LanguagesIcon } from "@/components/animate-ui/icons/languages";
import { Card } from "@/components/ui/card";
import { FileTextIcon, type FileTextIconHandle } from "@/components/ui/file-text";
import { cn } from "@/lib/utils";

import { StepWrapper } from "../shared/StepWrapper";
import type { BaseStepProps, PromptCategory, PromptConfigData } from "../shared/types";

const PROMPT_CATEGORIES: PromptCategory[] = [
  {
    id: "ui_translation",
    name: "UI Translations",
    description: "Instructions for translating interface labels, onboarding copy, and app navigation.",
    icon: LanguagesIcon,
  },
  {
    id: "inventory_translation",
    name: "Inventory",
    description: "Instructions for translating food items, categories, and source inventory content.",
    icon: FileTextIcon,
  },
  {
    id: "announcement_translation",
    name: "Announcements",
    description: "Instructions for translating public-facing staff announcements.",
    icon: MessageSquareQuoteIcon,
  },
];

export function PromptCategoryStep({ data, onChange }: BaseStepProps<PromptConfigData>) {
  const fileTextIconRef = React.useRef<FileTextIconHandle>(null);

  return (
    <StepWrapper
      icon={MessageSquareQuoteIcon}
      title="Prompt Category"
      description="Select the category that best fits your prompt purpose"
    >
      <div className="grid grid-cols-1 gap-2">
        {PROMPT_CATEGORIES.map((category) => {
          const Icon = category.icon;
          const isImperativeIcon = category.id === "inventory_translation";
          return (
            <AnimateIcon key={category.id} asChild animateOnView animateOnViewOnce animateOnHover animateOnTap>
              <Card
                className={cn(
                  "cursor-pointer p-3 transition-all hover:border-primary",
                  data.promptCategory === category.id && "border-primary bg-primary/5",
                )}
                onClick={() => onChange({ promptCategory: category.id })}
                onMouseEnter={isImperativeIcon ? () => fileTextIconRef.current?.startAnimation() : undefined}
                onMouseLeave={isImperativeIcon ? () => fileTextIconRef.current?.stopAnimation() : undefined}
              >
                <div className="flex items-start gap-3">
                  {isImperativeIcon ? (
                    <FileTextIcon
                      ref={fileTextIconRef}
                      className="mt-0.5 h-5 w-5 shrink-0 text-primary"
                      size={20}
                    />
                  ) : (
                    <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" size={20} />
                  )}
                  <div className="min-w-0 flex-1">
                    <h4 className="mb-1 text-sm font-medium text-foreground">{category.name}</h4>
                    <p className="text-xs text-muted-foreground">{category.description}</p>
                  </div>
                </div>
              </Card>
            </AnimateIcon>
          );
        })}
      </div>
    </StepWrapper>
  );
}
