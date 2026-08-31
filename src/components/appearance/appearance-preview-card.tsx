// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. Agency branding is not covered
// by this license; see TRADEMARKS.md.

"use client";

import { Eye } from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useBrand } from "@/contexts/brand-context";

export function AppearancePreviewCard() {
  const brand = useBrand();

  return (
    <Card data-appearance-preview className="h-full space-y-4 bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="size-4 text-muted-foreground" />
          Appearance preview
        </CardTitle>
        <CardDescription>
          Live samples from the active {brand.organizationName} appearance.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-3 rounded-xl border border-border bg-gradient-display p-4 shadow-sm">
          <BrandLogo
            className="mx-auto min-h-16 w-full max-w-64"
            imageClassName="max-h-20 w-auto max-w-full object-contain"
          />

          <div className="ticket-serving rounded-lg border-2 px-3 py-2 text-center">
            <span className="block text-2xl font-black leading-none">42</span>
            <span className="mt-1 block text-[10px] font-semibold uppercase tracking-widest">
              Now serving
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="ticket-served rounded-md border-2 px-2 py-1.5 text-center text-sm font-bold">
              Served 17
            </div>
            <div className="ticket-upcoming rounded-md border-2 px-2 py-1.5 text-center text-sm font-bold">
              Next up 58
            </div>
          </div>

          <Button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            className="pointer-events-none w-full"
          >
            Primary action
          </Button>

          <div className="rounded-lg border border-border bg-card p-3 text-sm text-card-foreground">
            Cards, controls, and queue progress follow your appearance across LOTTO.
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/40 p-2">
          <span className="rounded bg-[var(--operational-warning-action-bg)] px-2 py-0.5 text-[10px] font-bold text-[var(--operational-warning-action-fg)]">
            Unclaimed
          </span>
          <span className="rounded bg-[var(--operational-danger-action-bg)] px-2 py-0.5 text-[10px] font-bold text-[var(--operational-danger-action-fg)]">
            Returned
          </span>
          <p className="text-[11px] text-muted-foreground">
            Operational status colors stay universal.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
