// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. Agency branding is not covered
// by this license; see TRADEMARKS.md.

// Shared types for the Appearance wizard, mirroring the Translation AI
// wizard's step-definition idiom (FEED parity; see
// src/components/translation/ai-config/shared/types.ts).

import type { ComponentType } from "react";

import type { BrandConfig } from "@/lib/brand-theme/config-schema";

export type AppearanceDraftState = {
  id: string;
  config: BrandConfig;
  /** Which Start choice produced the current config ("scratch" or a template id). */
  startSource: string | null;
};

export type TemplateOption = {
  id: string;
  name: string;
  description: string;
  config: BrandConfig;
};

export type AppearanceStepProps = {
  draft: AppearanceDraftState;
  onChange: (updates: Partial<AppearanceDraftState>) => void;
  templates: TemplateOption[];
  isLoading: boolean;
  animateIntro: boolean;
};

export type AppearanceStepDefinition = {
  id: string;
  description: string;
  component: ComponentType<AppearanceStepProps>;
  validate?: (draft: AppearanceDraftState) => boolean;
};
