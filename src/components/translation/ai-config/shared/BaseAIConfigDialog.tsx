// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

"use client";

import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

import type { BaseDialogProps, ConfigData, ValidationState, ValidationType } from "./types";

const STEP_INTRO_RESET_DELAY_MS = 1500;

export function BaseAIConfigDialog<T extends ConfigData>({
  open,
  onOpenChange,
  mode,
  title,
  getSteps,
  initialData,
  onSave,
  isLoading = false,
  existingData,
}: BaseDialogProps<T>) {
  const [currentStepIndex, setCurrentStepIndex] = React.useState(0);
  const [data, setData] = React.useState<T>(initialData);
  const [validation, setValidation] = React.useState<ValidationState>({
    showValidation: false,
    errors: {},
  });
  const [saving, setSaving] = React.useState(false);
  const [stepIntro, setStepIntro] = React.useState(false);
  const stepIntroTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const steps = getSteps(data);
  const currentStep = steps[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  React.useEffect(() => {
    if (open) {
      setCurrentStepIndex(0);
      setData(mode === "edit" && existingData ? ({ ...initialData, ...existingData } as T) : initialData);
      setValidation({ showValidation: false, errors: {} });
    } else {
      setCurrentStepIndex(0);
      setData(initialData);
      setValidation({ showValidation: false, errors: {} });
    }
  }, [open, mode, initialData, existingData]);

  React.useEffect(() => {
    if (currentStepIndex >= steps.length && steps.length > 0) {
      setCurrentStepIndex(steps.length - 1);
    }
  }, [steps.length, currentStepIndex]);

  React.useEffect(() => {
    if (stepIntroTimerRef.current) {
      clearTimeout(stepIntroTimerRef.current);
      stepIntroTimerRef.current = null;
    }

    if (!open) {
      setStepIntro(false);
      return;
    }

    setStepIntro(true);
    stepIntroTimerRef.current = setTimeout(() => {
      setStepIntro(false);
      stepIntroTimerRef.current = null;
    }, STEP_INTRO_RESET_DELAY_MS);

    return () => {
      if (stepIntroTimerRef.current) {
        clearTimeout(stepIntroTimerRef.current);
        stepIntroTimerRef.current = null;
      }
    };
  }, [open, currentStepIndex]);

  const handleDataChange = (updates: Partial<T>) => {
    setData((prev) => ({ ...prev, ...updates }));
  };

  const handleBlur = (_field: keyof T, _validationType: ValidationType = "required") => {
    void _field;
    void _validationType;
    // FEED exposes this hook to steps. LOTTO preserves the interface; step-level
    // validations are currently performed by each step definition.
  };

  const isStepValid = () => (currentStep?.validate ? currentStep.validate(data) : true);

  const handleNext = () => {
    if (!isStepValid()) {
      setValidation((prev) => ({ ...prev, showValidation: true }));
      toast.error("Please fix validation errors before proceeding.");
      return;
    }
    if (!isLastStep) setCurrentStepIndex((prev) => prev + 1);
  };

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      setCurrentStepIndex(0);
      setData(initialData);
      setValidation({ showValidation: false, errors: {} });
    }
    onOpenChange(nextOpen);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const success = await onSave(data);
      if (success) handleClose(false);
    } finally {
      setSaving(false);
    }
  };

  if (!currentStep) return null;

  const StepComponent = currentStep.component;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>{mode === "add" ? `Add ${title}` : `Edit ${title}`}</DialogTitle>
          <DialogDescription>{currentStep.description}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[480px]">
          <StepComponent
            mode={mode}
            data={data}
            onChange={handleDataChange}
            animateIntro={stepIntro}
            isLoading={isLoading || saving}
            validation={validation}
            onBlur={handleBlur}
          />
        </ScrollArea>

        <div className="flex justify-between pt-4">
          {isFirstStep ? (
            <Button variant="outline" onClick={() => handleClose(false)} disabled={saving}>
              Cancel
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => setCurrentStepIndex((prev) => prev - 1)}
              disabled={saving}
            >
              Back
            </Button>
          )}

          {isLastStep ? (
            <Button onClick={handleSave} disabled={!isStepValid() || isLoading || saving}>
              {saving || isLoading
                ? mode === "add"
                  ? "Creating..."
                  : "Saving..."
                : mode === "add"
                  ? `Create ${title}`
                  : "Save Changes"}
            </Button>
          ) : (
            <Button onClick={handleNext} disabled={!isStepValid() || saving}>
              Next
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
