// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

// The set of translatable content the auditor scans: every English UI string,
// the active announcement, and the inventory category/item names from the FEED
// public inventory feed.

import { fetchFeedPublicInventory } from "@/lib/feed-public-inventory";
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

// Distinct English inventory strings (category + item names) from the FEED feed.
// Failure is non-fatal — inventory is the lowest-priority content domain, so a
// feed hiccup must never break the UI-string / announcement audit.
export const getInventorySources = async (): Promise<string[]> => {
  try {
    const inventory = await fetchFeedPublicInventory();
    const set = new Set<string>();
    for (const category of inventory.categories) {
      if (category.name?.trim()) set.add(category.name);
      for (const item of category.items) {
        if (item.name?.trim()) set.add(item.name);
      }
    }
    return [...set];
  } catch (error) {
    console.warn("[Translation content] Unable to load FEED inventory for translation.", error);
    return [];
  }
};

export const getContentItems = async (): Promise<ContentItem[]> => {
  const items: ContentItem[] = getUiStringSources().map((originalText) => ({
    originalText,
    type: "ui_string" as const,
  }));
  const announcement = await getAnnouncementSource();
  if (announcement) items.push({ originalText: announcement, type: "announcement" });
  const inventorySources = await getInventorySources();
  for (const originalText of inventorySources) {
    items.push({ originalText, type: "inventory" as const });
  }
  return items;
};
