// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

// The set of translatable content the auditor scans: every English UI string
// plus the active announcement. Custom strings are managed directly in the store
// and are not enumerated here.

import { stateManager } from "@/lib/state-manager";
import { UI_STRINGS_EN } from "@/lib/ui-strings";
import type { TranslationType } from "./types";

export type ContentItem = { originalText: string; type: TranslationType };

// Distinct English UI strings (multiple keys may share the same text; one
// translation row covers them all, which is also how t() resolves them).
export const getUiStringSources = (): string[] => {
  const set = new Set<string>();
  for (const value of Object.values(UI_STRINGS_EN)) {
    const text = value?.trim();
    if (text) set.add(value);
  }
  return [...set];
};

export const getAnnouncementSource = async (): Promise<string | null> => {
  const state = await stateManager.loadState();
  const announcement = state.announcement;
  if (announcement?.enabled && announcement.markdown?.trim()) {
    return announcement.markdown;
  }
  return null;
};

export const getContentItems = async (): Promise<ContentItem[]> => {
  const items: ContentItem[] = getUiStringSources().map((originalText) => ({
    originalText,
    type: "ui_string" as const,
  }));
  const announcement = await getAnnouncementSource();
  if (announcement) items.push({ originalText: announcement, type: "announcement" });
  return items;
};
