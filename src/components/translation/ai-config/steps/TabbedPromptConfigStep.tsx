// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.

"use client";

import { MessageSquareMoreIcon } from "@/components/animate-ui/icons/message-square-more";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

import { StepWrapper } from "../shared/StepWrapper";
import type { BaseStepProps, PromptConfigData } from "../shared/types";

export function TabbedPromptConfigStep({
  data,
  onChange,
  isLoading = false,
  validation,
  onBlur,
}: BaseStepProps<PromptConfigData>) {
  return (
    <StepWrapper
      icon={MessageSquareMoreIcon}
      title="Translation Customization"
      description="Customize your translation prompt with specific guidance"
    >
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="basic">Basic</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>
        <TabsContent value="basic" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="serviceDescription">Service Description</Label>
              <Input
                id="serviceDescription"
                value={data.serviceDescription}
                onChange={(event) => onChange({ serviceDescription: event.target.value })}
                onBlur={() => onBlur?.("serviceDescription")}
                placeholder="You are a translation service..."
                disabled={isLoading}
                className={validation?.showValidation && validation.errors.serviceDescription ? "border-destructive" : ""}
              />
              <p className="text-xs text-muted-foreground">Describe the AI&apos;s role and purpose.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="translationApproach">Translation Approach</Label>
              <Input
                id="translationApproach"
                value={data.translationApproach}
                onChange={(event) => onChange({ translationApproach: event.target.value })}
                onBlur={() => onBlur?.("translationApproach")}
                placeholder="using closest natural equivalent..."
                disabled={isLoading}
                className={validation?.showValidation && validation.errors.translationApproach ? "border-destructive" : ""}
              />
              <p className="text-xs text-muted-foreground">Define how translations should be approached.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contextGuidance">Context Guidance</Label>
              <Input
                id="contextGuidance"
                value={data.contextGuidance}
                onChange={(event) => onChange({ contextGuidance: event.target.value })}
                onBlur={() => onBlur?.("contextGuidance")}
                placeholder="In public pantry service contexts..."
                disabled={isLoading}
                className={validation?.showValidation && validation.errors.contextGuidance ? "border-destructive" : ""}
              />
              <p className="text-xs text-muted-foreground">Provide context-specific guidance.</p>
            </div>
        </TabsContent>
        <TabsContent value="advanced" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="additionalGuidance">Additional Guidance (Optional)</Label>
              <Textarea
                id="additionalGuidance"
                value={data.additionalGuidance}
                onChange={(event) => onChange({ additionalGuidance: event.target.value })}
                onBlur={() => onBlur?.("additionalGuidance")}
                placeholder="Any extra instructions..."
                rows={3}
                maxLength={1800}
                disabled={isLoading}
                className={validation?.showValidation && validation.errors.additionalGuidance ? "border-destructive" : ""}
              />
              <div className="flex justify-between">
                <p className="text-xs text-muted-foreground">Any additional instructions or constraints.</p>
                <p className="text-xs text-muted-foreground">{data.additionalGuidance.length}/1,800</p>
              </div>
            </div>
        </TabsContent>
      </Tabs>
    </StepWrapper>
  );
}
