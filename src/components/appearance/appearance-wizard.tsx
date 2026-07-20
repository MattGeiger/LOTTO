// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. Agency branding is not covered
// by this license; see TRADEMARKS.md.

"use client";

// The multi-step Appearance wizard (docs/CONFIGURABLE_BRANDING_PLAN.md,
// Phase 2). Mirrors the Translation AI wizard's dialog mechanics
// (BaseAIConfigDialog): step definitions with per-step validation, the
// animated step-intro icon, and a Back/Next footer — with a two-action final
// step (Save draft / Save & activate).

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
import { parseBrandConfig } from "@/lib/brand-theme/config-schema";

import { draftThemeIssues, scratchConfig } from "./draft";
import { CapabilitiesStep } from "./steps/CapabilitiesStep";
import { ColorsStep } from "./steps/ColorsStep";
import { IdentityStep } from "./steps/IdentityStep";
import { LogosStep } from "./steps/LogosStep";
import { ReviewStep } from "./steps/ReviewStep";
import { StaffStep } from "./steps/StaffStep";
import { StartStep } from "./steps/StartStep";
import type {
  AppearanceDraftState,
  AppearanceStepDefinition,
  TemplateOption,
} from "./types";

const STEP_INTRO_RESET_DELAY_MS = 1500;

const configReady = (draft: AppearanceDraftState) =>
  parseBrandConfig(draft.config).ok && draftThemeIssues(draft.config).length === 0;

const STEPS: AppearanceStepDefinition[] = [
  {
    id: "start",
    description: "Choose a starting point for this appearance.",
    component: StartStep,
    validate: (draft) => draft.id.length >= 2 && draft.startSource !== null,
  },
  {
    id: "identity",
    description: "Your organization's names and copy.",
    component: IdentityStep,
    validate: (draft) =>
      draft.config.identity.organizationName.trim().length > 0 &&
      draft.config.identity.appName.trim().length > 0 &&
      draft.config.identity.shortName.trim().length > 0,
  },
  {
    id: "logos",
    description: "Logos and install icons.",
    component: LogosStep,
  },
  {
    id: "colors",
    description: "Brand colors with a live preview.",
    component: ColorsStep,
    validate: (draft) => draftThemeIssues(draft.config).length === 0,
  },
  {
    id: "staff",
    description: "Staff sign-in copy.",
    component: StaffStep,
  },
  {
    id: "capabilities",
    description: "Optional integrations.",
    component: CapabilitiesStep,
    validate: (draft) =>
      !draft.config.capabilities.inventory.enabled ||
      Boolean(draft.config.capabilities.inventory.feedUrl?.trim()),
  },
  {
    id: "review",
    description: "Check everything and save.",
    component: ReviewStep,
    validate: configReady,
  },
];

const emptyDraft = (): AppearanceDraftState => ({
  id: "",
  config: scratchConfig(),
  startSource: null,
});

export function AppearanceWizard({
  open,
  onOpenChange,
  templates,
  existingDraft,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: TemplateOption[];
  /** When editing a saved configuration, its current state. */
  existingDraft?: AppearanceDraftState | null;
  onSaved: () => void;
}) {
  const [stepIndex, setStepIndex] = React.useState(0);
  const [draft, setDraft] = React.useState<AppearanceDraftState>(emptyDraft);
  const [saving, setSaving] = React.useState<null | "draft" | "activate">(null);
  const [stepIntro, setStepIntro] = React.useState(false);
  const stepIntroTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Editing an existing configuration skips the Start step.
  const steps = existingDraft ? STEPS.slice(1) : STEPS;
  const currentStep = steps[stepIndex];
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === steps.length - 1;

  React.useEffect(() => {
    if (open) {
      setStepIndex(0);
      setDraft(
        existingDraft
          ? { ...existingDraft, startSource: existingDraft.startSource ?? "saved" }
          : emptyDraft(),
      );
      setSaving(null);
    }
  }, [open, existingDraft]);

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
  }, [open, stepIndex]);

  const handleChange = (updates: Partial<AppearanceDraftState>) => {
    setDraft((previous) => ({ ...previous, ...updates }));
  };

  const stepValid = currentStep?.validate ? currentStep.validate(draft) : true;

  const handleNext = () => {
    if (!stepValid) {
      toast.error("Please finish this step before continuing.");
      return;
    }
    if (!isLastStep) setStepIndex((previous) => previous + 1);
  };

  const handleSave = async (activate: boolean) => {
    setSaving(activate ? "activate" : "draft");
    try {
      const response = await fetch("/api/brand-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: draft.id, payload: draft.config, activate }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        const detail = Array.isArray(body.issues) ? ` ${body.issues[0]}` : "";
        toast.error(`${body.error ?? "Saving failed."}${detail}`);
        return;
      }
      toast.success(
        activate
          ? "Appearance saved and activated."
          : "Appearance saved as a draft.",
      );
      onSaved();
      onOpenChange(false);
    } catch {
      toast.error("Saving failed. Please try again.");
    } finally {
      setSaving(null);
    }
  };

  if (!currentStep) return null;
  const StepComponent = currentStep.component;
  const busy = saving !== null;

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="sm:max-w-[620px]">
        <DialogHeader>
          <DialogTitle>
            {existingDraft ? "Edit appearance" : "Set up appearance"}
          </DialogTitle>
          <DialogDescription>
            Step {stepIndex + 1} of {steps.length} — {currentStep.description}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[480px]">
          <StepComponent
            draft={draft}
            onChange={handleChange}
            templates={templates}
            isLoading={busy}
            animateIntro={stepIntro}
          />
        </ScrollArea>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-4">
          {isFirstStep ? (
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => setStepIndex((previous) => previous - 1)}
              disabled={busy}
            >
              Back
            </Button>
          )}

          {isLastStep ? (
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => void handleSave(false)}
                disabled={!stepValid || busy}
              >
                {saving === "draft" ? "Saving…" : "Save draft"}
              </Button>
              <Button
                onClick={() => void handleSave(true)}
                disabled={!stepValid || busy}
              >
                {saving === "activate" ? "Activating…" : "Save & activate"}
              </Button>
            </div>
          ) : (
            <Button onClick={handleNext} disabled={!stepValid || busy}>
              Next
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
