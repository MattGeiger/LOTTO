// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. Agency branding is not covered
// by this license; see TRADEMARKS.md.

"use client";

import * as React from "react";

import { CircleCheckIcon } from "@/components/animate-ui/icons/circle-check";
import { Label } from "@/components/ui/label";
import { StepWrapper } from "@/components/translation/ai-config/shared/StepWrapper";
import { parseBrandConfig } from "@/lib/brand-theme/config-schema";

import { draftTheme, draftThemeIssues } from "../draft";
import { ThemePreview } from "../theme-preview";
import type { AppearanceStepProps } from "../types";

export function ReviewStep({ draft, animateIntro }: AppearanceStepProps) {
  const parsed = parseBrandConfig(draft.config);
  const themeIssues = draftThemeIssues(draft.config);
  const problems = [
    ...(parsed.ok ? [] : parsed.errors),
    ...themeIssues.map((issue) => issue.message),
  ];
  const inventory = draft.config.capabilities.inventory;

  const facts: [string, string][] = [
    ["Configuration", draft.id || "(unnamed)"],
    ["Organization", draft.config.identity.organizationName],
    ["App name", draft.config.identity.appName],
    ["Home-screen label", draft.config.identity.shortName],
    ["Website", draft.config.links.organizationWebsite],
    ["Public app URL", draft.config.links.publicAppUrl],
    ["Inventory", inventory.enabled ? `Enabled — ${inventory.feedUrl}` : "Off (queue-only)"],
  ];

  return (
    <StepWrapper
      icon={CircleCheckIcon}
      title="Review & save"
      description="Save as a draft to keep working, or save and activate to make this the live appearance."
      animateIntro={animateIntro}
    >
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
        {facts.map(([label, value]) => (
          <React.Fragment key={label}>
            <dt className="font-medium text-muted-foreground">{label}</dt>
            <dd className="min-w-0 truncate">{value}</dd>
          </React.Fragment>
        ))}
      </dl>

      <div className="space-y-2">
        <Label>Theme preview</Label>
        <ThemePreview theme={draftTheme(draft.config)} />
      </div>

      {problems.length > 0 ? (
        <div
          role="alert"
          className="space-y-1 rounded-lg border border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] p-3"
        >
          <p className="text-sm font-semibold text-[var(--status-danger-text)]">
            This configuration can&apos;t be saved yet
          </p>
          <ul className="list-disc space-y-1 pl-5 text-xs text-[var(--status-danger-text)]">
            {problems.map((problem, index) => (
              <li key={index}>{problem}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Everything checks out. Activation applies instantly and can be
          reverted from the Appearance card at any time.
        </p>
      )}
    </StepWrapper>
  );
}
