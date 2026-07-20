// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

// The set of translatable content the auditor scans: every English UI string,
// the active announcement, and the inventory category/item names from the FEED
// public inventory feed.

import {
  collectFeedInventoryNames,
  fetchFeedPublicInventory,
} from "@/lib/feed-public-inventory";
import { getResolvedBrand } from "@/lib/brand-config/resolve";
import { stateManager } from "@/lib/state-manager";
import { UI_STRINGS_EN } from "@/lib/ui-strings";
import type { TranslationType } from "./types";

export type ContentItem = { originalText: string; type: TranslationType };

// Diagnostic for the inventory feed fetch — surfaced to the admin so a feed
// failure on the server is visible (with the literal error + URL) instead of
// silently producing zero inventory.
export type InventorySourceResult = {
  names: string[];
  ok: boolean;
  error: string | null;
  url: string;
};

export type ContentResult = { items: ContentItem[]; inventory: InventorySourceResult };

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

// Distinct English inventory strings (category + item names) from the FEED feed,
// plus diagnostics. Failure is non-fatal — inventory is the lowest-priority
// content domain, so a feed hiccup must never break the UI-string / announcement
// audit — but the error/URL are captured so the admin can see *why* it failed.
export const getInventorySource = async (): Promise<InventorySourceResult> => {
  // Inventory enablement and URL come from the resolved runtime brand (saved
  // configuration or compiled profile) — never from a cross-agency fallback.
  const { inventory: integration } = await getResolvedBrand();
  const url = integration.url;
  if (!integration.enabled || !url) {
    return { names: [], ok: true, error: null, url: "" };
  }
  try {
    const inventory = await fetchFeedPublicInventory(url);
    return { names: collectFeedInventoryNames(inventory), ok: true, error: null, url };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[Translation content] Unable to load FEED inventory (${url}): ${message}`);
    return { names: [], ok: false, error: message, url };
  }
};

// Wrap inventory names supplied by the caller (the admin browser, which can
// reach the public feed even when the server's egress is blocked) as a healthy
// inventory source — deduped, trimmed, with the feed URL for diagnostics.
const fromInjectedInventoryNames = async (
  names: string[],
): Promise<InventorySourceResult> => {
  const { inventory: integration } = await getResolvedBrand();
  if (!integration.enabled) {
    return { names: [], ok: true, error: null, url: "" };
  }
  const set = new Set<string>();
  for (const name of names) {
    if (name?.trim()) set.add(name);
  }
  return { names: [...set], ok: true, error: null, url: integration.url ?? "" };
};

// Back-compat: callers that only need the names.
export const getInventorySources = async (): Promise<string[]> =>
  (await getInventorySource()).names;

export const getContentItems = async (
  options?: { inventoryNames?: string[] },
): Promise<ContentResult> => {
  const items: ContentItem[] = getUiStringSources().map((originalText) => ({
    originalText,
    type: "ui_string" as const,
  }));
  const announcement = await getAnnouncementSource();
  if (announcement) items.push({ originalText: announcement, type: "announcement" });
  // Prefer inventory names the caller bridged from the browser (FEED's feed is
  // public but the server's egress can be blocked); otherwise fetch server-side.
  const inventory = options?.inventoryNames
    ? await fromInjectedInventoryNames(options.inventoryNames)
    : await getInventorySource();
  for (const originalText of inventory.names) {
    items.push({ originalText, type: "inventory" as const });
  }
  return { items, inventory };
};
