// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

"use client";

import * as React from "react";
import type { ComponentType } from "react";

import { AnimateIcon } from "@/components/animate-ui/icons/icon";

type StepIcon = ComponentType<{ className?: string; size?: number }>;

export function StepWrapper({
  icon: Icon,
  title,
  description,
  children,
  suppressHeader = false,
}: {
  icon: StepIcon;
  title: string;
  description: string;
  children: React.ReactNode;
  suppressHeader?: boolean;
}) {
  if (suppressHeader) {
    return <div className="space-y-4">{children}</div>;
  }

  return (
    <div className="px-2">
      <div className="space-y-4">
        <div className="text-center">
          <AnimateIcon animateOnView animateOnViewOnce animateOnHover className="inline-block">
            <Icon className="mx-auto h-12 w-12 text-muted-foreground" size={48} />
          </AnimateIcon>
          <h3 className="mt-2 text-lg font-medium">{title}</h3>
          <p className="mb-4 text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="space-y-4">{children}</div>
      </div>
    </div>
  );
}
