// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

// Core RTL languages plus RTL catalog languages (Urdu) from the expanded set.
export const RTL_LANGUAGES = ["ar", "fa", "ur"] as const;
export type RTLLanguage = (typeof RTL_LANGUAGES)[number];

export function isRTL(language: string): boolean {
  return RTL_LANGUAGES.includes(language as RTLLanguage);
}
