// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. Agency branding is not covered
// by this license; see TRADEMARKS.md.

"use client";

import * as React from "react";

import { FileTextIcon } from "@/components/ui/file-text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StepWrapper } from "@/components/translation/ai-config/shared/StepWrapper";

import { generatedDescriptions, patchConfig } from "../draft";
import type { AppearanceStepProps } from "../types";

function Field({
  id,
  label,
  value,
  onCommit,
  hint,
  maxLength = 200,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onCommit: (value: string) => void;
  hint?: string;
  maxLength?: number;
  disabled: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        onChange={(event) => onCommit(event.target.value)}
        maxLength={maxLength}
        disabled={disabled}
      />
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function IdentityStep({
  draft,
  onChange,
  isLoading,
  animateIntro,
}: AppearanceStepProps) {
  const { identity, links } = draft.config;

  const setIdentity = (updates: Partial<typeof identity>) =>
    onChange({ config: patchConfig(draft.config, "identity", updates) });
  const setLinks = (updates: Partial<typeof links>) =>
    onChange({ config: patchConfig(draft.config, "links", updates) });

  return (
    <StepWrapper
      icon={FileTextIcon}
      title="Organization identity"
      description="Names and copy shown across the app, browser tabs, and install prompts."
      animateIntro={animateIntro}
    >
      <Field
        id="identity-org"
        label="Organization name"
        value={identity.organizationName}
        onCommit={(organizationName) => setIdentity({ organizationName })}
        disabled={isLoading}
      />
      <Field
        id="identity-app"
        label="App name"
        value={identity.appName}
        onCommit={(appName) => setIdentity({ appName })}
        hint="Browser tab title and install name."
        disabled={isLoading}
      />
      <Field
        id="identity-short"
        label="Home-screen label"
        value={identity.shortName}
        onCommit={(shortName) => setIdentity({ shortName })}
        hint="What phones show under the installed app icon — check the exact spelling your organization uses."
        maxLength={60}
        disabled={isLoading}
      />
      <Field
        id="identity-tagline"
        label="Tagline"
        value={identity.tagline}
        onCommit={(tagline) => setIdentity({ tagline })}
        disabled={isLoading}
      />
      <div className="space-y-1.5">
        <Label htmlFor="identity-service-label">Service heading</Label>
        <Input
          id="identity-service-label"
          value={identity.serviceLabel ?? ""}
          onChange={(event) =>
            setIdentity({ serviceLabel: event.target.value || undefined })
          }
          placeholder="Food Pantry Service For"
          maxLength={60}
          disabled={isLoading}
        />
        <p className="text-xs text-muted-foreground">
          Shown above the date on the board — the service date follows it
          (&quot;… For Sunday, July 19th&quot;). Fits any kind of queue:
          &quot;Clinic Hours For&quot;, &quot;Equipment Checkout For&quot;.
          Leave blank for the standard translated heading.
        </p>
      </div>
      <Field
        id="links-website"
        label="Organization website"
        value={links.organizationWebsite}
        onCommit={(organizationWebsite) => setLinks({ organizationWebsite })}
        hint="Linked from the About dialog."
        disabled={isLoading}
      />
      <Field
        id="links-app"
        label="Public app URL"
        value={links.publicAppUrl}
        onCommit={(publicAppUrl) => setLinks({ publicAppUrl })}
        hint="Where this app will live, e.g. https://queue.your-agency.org"
        disabled={isLoading}
      />

      <div className="flex items-center justify-between gap-2 pt-1">
        <p className="text-sm font-medium">Page descriptions</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isLoading}
          onClick={() => setIdentity(generatedDescriptions(identity.organizationName))}
        >
          Use suggested wording
        </Button>
      </div>
      {(
        [
          ["description", "Homepage"],
          ["displayDescription", "Display board"],
          ["inventoryDescription", "Inventory"],
          ["adminDescription", "Admin"],
        ] as const
      ).map(([key, label]) => (
        <div key={key} className="space-y-1.5">
          <Label htmlFor={`identity-${key}`}>{label} description</Label>
          <Textarea
            id={`identity-${key}`}
            value={identity[key]}
            onChange={(event) => setIdentity({ [key]: event.target.value })}
            rows={2}
            maxLength={300}
            disabled={isLoading}
          />
        </div>
      ))}
    </StepWrapper>
  );
}
