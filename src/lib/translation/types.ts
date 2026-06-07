// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

// Translation Management types (ported/adapted from FEED). LOTTO's translatable
// content is UI strings (from the language context) and the active announcement,
// plus staff-authored custom strings.

export const TRANSLATION_TYPES = ["ui_string", "announcement", "custom"] as const;
export type TranslationType = (typeof TRANSLATION_TYPES)[number];

export const TRANSLATION_STATUSES = ["pending", "completed", "failed"] as const;
export type TranslationStatus = (typeof TRANSLATION_STATUSES)[number];

export type TranslationRecord = {
  id: number;
  originalText: string;
  translatedText: string | null;
  status: TranslationStatus;
  /** Target language English name (matches `languages.name`). */
  language: string;
  type: TranslationType;
  metadata: Record<string, unknown> | null;
  promptTokens: number | null;
  completionTokens: number | null;
  totalCost: number | null;
  createdAt: number;
  updatedAt: number;
};

export type TranslationFilter = {
  language?: string;
  type?: TranslationType;
  status?: TranslationStatus;
};

// Identity of a translatable item (one row per original×language×type).
export type TranslationKey = {
  originalText: string;
  language: string;
  type: TranslationType;
};
