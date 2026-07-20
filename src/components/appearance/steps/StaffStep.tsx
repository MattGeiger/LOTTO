// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. Agency branding is not covered
// by this license; see TRADEMARKS.md.

"use client";

import * as React from "react";

import { UsersIcon } from "@/components/animate-ui/icons/users";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StepWrapper } from "@/components/translation/ai-config/shared/StepWrapper";

import { patchConfig } from "../draft";
import type { AppearanceStepProps } from "../types";

export function StaffStep({
  draft,
  onChange,
  isLoading,
  animateIntro,
}: AppearanceStepProps) {
  const { staff } = draft.config;
  const setStaff = (updates: Partial<typeof staff>) =>
    onChange({ config: patchConfig(draft.config, "staff", updates) });

  return (
    <StepWrapper
      icon={UsersIcon}
      title="Staff sign-in"
      description="The copy your staff see on the login screen."
      animateIntro={animateIntro}
    >
      <div className="space-y-1.5">
        <Label htmlFor="staff-title">Sign-in heading</Label>
        <Input
          id="staff-title"
          value={staff.signInTitle}
          onChange={(event) => setStaff({ signInTitle: event.target.value })}
          maxLength={100}
          disabled={isLoading}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="staff-guidance">Email guidance</Label>
        <Input
          id="staff-guidance"
          value={staff.emailGuidance}
          onChange={(event) => setStaff({ emailGuidance: event.target.value })}
          maxLength={200}
          disabled={isLoading}
        />
        <p className="text-xs text-muted-foreground">
          Shown under the heading, e.g. which email addresses are authorized.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="staff-placeholder">Email field placeholder</Label>
        <Input
          id="staff-placeholder"
          value={staff.emailPlaceholder}
          onChange={(event) => setStaff({ emailPlaceholder: event.target.value })}
          maxLength={100}
          disabled={isLoading}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Which emails can actually sign in is controlled by the
        deployment&apos;s `ADMIN_EMAIL_DOMAIN` / `ADMIN_EMAIL_ALLOWLIST`
        settings, not by this copy.
      </p>
    </StepWrapper>
  );
}
