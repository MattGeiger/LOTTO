// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. Agency branding is not covered
// by this license; see TRADEMARKS.md.

"use client";

import * as React from "react";

import { PackageCheckIcon } from "@/components/animate-ui/icons/package-check";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { StepWrapper } from "@/components/translation/ai-config/shared/StepWrapper";

import { patchConfig } from "../draft";
import type { AppearanceStepProps } from "../types";

export function CapabilitiesStep({
  draft,
  onChange,
  isLoading,
  animateIntro,
}: AppearanceStepProps) {
  const inventory = draft.config.capabilities.inventory;
  const setInventory = (updates: Partial<typeof inventory>) =>
    onChange({
      config: patchConfig(draft.config, "capabilities", {
        inventory: { ...inventory, ...updates },
      }),
    });

  return (
    <StepWrapper
      icon={PackageCheckIcon}
      title="What's in stock"
      description="Optional FEED inventory integration. Leave off for a queue-only deployment."
      animateIntro={animateIntro}
    >
      <div className="flex items-center justify-between gap-2 rounded-lg border border-border p-3">
        <div>
          <Label htmlFor="inventory-enabled">Show inventory</Label>
          <p className="text-xs text-muted-foreground">
            Adds the &quot;What&apos;s in stock&quot; tab fed by your FEED
            public inventory.
          </p>
        </div>
        <Switch
          id="inventory-enabled"
          checked={inventory.enabled}
          onCheckedChange={(enabled) =>
            setInventory({ enabled, feedUrl: enabled ? inventory.feedUrl : null })
          }
          disabled={isLoading}
        />
      </div>
      {inventory.enabled ? (
        <div className="space-y-1.5">
          <Label htmlFor="inventory-url">FEED public inventory URL</Label>
          <Input
            id="inventory-url"
            value={inventory.feedUrl ?? ""}
            onChange={(event) => setInventory({ feedUrl: event.target.value || null })}
            placeholder="https://feed.your-agency.org/api/public/inventory.json"
            spellCheck={false}
            disabled={isLoading}
          />
          <p className="text-xs text-muted-foreground">
            Your own FEED deployment&apos;s public feed. If it ever fails, the
            page shows an error — it never falls back to another agency&apos;s
            inventory. On hosted deployments the same URL must also be set as
            `NEXT_PUBLIC_FEED_PUBLIC_INVENTORY_URL` so the browser security
            policy (CSP) allows the request.
          </p>
        </div>
      ) : null}
    </StepWrapper>
  );
}
