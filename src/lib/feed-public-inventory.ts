// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

import type { Language } from "@/contexts/language-context";
import { getCatalogEntryByCode } from "@/lib/languages";
import { brandProfile, inventoryIntegration } from "@/config/brand";

export type FeedLimitType = "household" | "person" | string;

export type FeedPublicInventory = {
  generatedAt: string;
  version: string;
  languages: string[];
  categories: FeedInventoryCategory[];
  totals: {
    categories: number;
    foodItems: number;
  };
};

export type FeedInventoryCategory = {
  id: number;
  name: string;
  translations: Record<string, string>;
  icon: string | null;
  limit: number | null;
  limitType: FeedLimitType | null;
  itemCount: number;
  items: FeedInventoryItem[];
};

export type FeedInventoryItem = {
  id: number;
  name: string;
  translations: Record<string, string>;
  limit: number | null;
  limitType: FeedLimitType | null;
  statusTags: {
    inStock: true;
    limited: boolean;
    clearance: boolean;
  };
  dietaryFlags: {
    vegan: boolean;
    vegetarian: boolean;
    glutenFree: boolean;
    organic: boolean;
    halal: boolean;
    kosher: boolean;
    readyToEat: boolean;
  };
  updatedAt: string;
};

export const feedLanguageByLottoLanguage: Record<Language, string> = {
  en: "English",
  zh: "Chinese",
  es: "Spanish",
  ru: "Russian",
  uk: "Ukrainian",
  vi: "Vietnamese",
  fa: "Persian",
  ar: "Arabic",
};

type TranslatedFeedEntity = {
  name: string;
  translations: Record<string, string>;
};

export function getFeedPublicInventoryUrl(): string | null {
  return inventoryIntegration.url;
}

export function getFeedDisplayName(entity: TranslatedFeedEntity, language: Language): string {
  // Core codes use the explicit FEED-name map; dynamic catalog languages map
  // code → English name (FEED keys its public translations by language name),
  // so inventory already translated in FEED shows up for newly enabled languages.
  const feedLanguage = feedLanguageByLottoLanguage[language] ?? getCatalogEntryByCode(language)?.name ?? "";
  const translatedName = entity.translations[feedLanguage];
  return translatedName && translatedName.trim().length > 0 ? translatedName : entity.name;
}

// Flatten a feed payload into its distinct English category + item names — the
// source set LOTTO's own AI pipeline translates into the languages FEED doesn't
// carry. Used server-side (the content auditor) and client-side (the admin
// browser bridges these names past a server-egress block to find-missing).
export function collectFeedInventoryNames(inventory: FeedPublicInventory): string[] {
  const set = new Set<string>();
  for (const category of inventory.categories) {
    if (category.name?.trim()) set.add(category.name);
    for (const item of category.items) {
      if (item.name?.trim()) set.add(item.name);
    }
  }
  return [...set];
}

export function formatFeedLimit(limit: number | null | undefined, limitType: FeedLimitType | null | undefined): string {
  if (limit == null || !Number.isFinite(limit) || limit <= 0 || limit >= 100) return "";
  if (limitType === "person") return `Limit ${limit} per person`;
  if (limitType === "household") return `Limit ${limit} per household`;
  return `Limit ${limit}`;
}

export async function fetchFeedPublicInventory(
  url: string | null = getFeedPublicInventoryUrl(),
): Promise<FeedPublicInventory> {
  if (!url) throw new Error("Inventory integration is disabled for this deployment.");
  return fetchFeedPublicInventoryFromUrl(url);
}

async function fetchFeedPublicInventoryFromUrl(url: string): Promise<FeedPublicInventory> {
  // Header policy is split by runtime ON PURPOSE — do not send `User-Agent` from
  // the browser:
  //   • `Accept` is a CORS-safelisted request header, so it never triggers a
  //     preflight — safe to send everywhere.
  //   • `User-Agent` is NOT safelisted. Setting it on a cross-origin *browser*
  //     fetch promotes the request to a preflighted one; FEED's CORS only allows
  //     `Content-Type` in `Access-Control-Allow-Headers`, so the preflight fails
  //     and the browser blocks the GET — breaking both the visitor inventory page
  //     and the admin inventory-name bridge. We therefore attach `User-Agent`
  //     ONLY on the server (Node/undici sends none by default; harmless there and
  //     never subject to CORS). See docs/FEED_PUBLIC_INVENTORY.md and ISSUES.md
  //     Issue 23.
  const headers: Record<string, string> = { Accept: "application/json" };
  if (typeof window === "undefined") {
    headers["User-Agent"] = `LOTTO/1.0 (+${brandProfile.publicAppUrl})`;
  }

  const response = await fetch(url, {
    cache: "no-store",
    credentials: "omit",
    headers,
  });

  if (!response.ok) {
    // Include the status (and a short body snippet) so a server-side block —
    // e.g. a WAF/protection page returning 401/403/429 — is named precisely
    // instead of hidden behind a generic message.
    let snippet = "";
    try {
      snippet = (await response.text()).replace(/\s+/g, " ").trim().slice(0, 160);
    } catch {
      /* ignore body read errors */
    }
    throw new Error(`HTTP ${response.status}${snippet ? ` — ${snippet}` : ""}`);
  }

  const payload = await response.json();
  if (!isFeedPublicInventory(payload)) {
    throw new Error("Inventory response was not in the expected format.");
  }

  return payload;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTranslations(value: unknown): value is Record<string, string> {
  return isRecord(value) && Object.values(value).every((entry) => typeof entry === "string");
}

function isFeedPublicInventory(value: unknown): value is FeedPublicInventory {
  if (!isRecord(value)) return false;
  if (typeof value.generatedAt !== "string") return false;
  if (typeof value.version !== "string") return false;
  if (!Array.isArray(value.languages) || !value.languages.every((language) => typeof language === "string")) {
    return false;
  }
  if (!isRecord(value.totals)) return false;
  if (typeof value.totals.categories !== "number" || typeof value.totals.foodItems !== "number") {
    return false;
  }
  return Array.isArray(value.categories) && value.categories.every(isFeedInventoryCategory);
}

function isFeedInventoryCategory(value: unknown): value is FeedInventoryCategory {
  if (!isRecord(value)) return false;
  if (typeof value.id !== "number") return false;
  if (typeof value.name !== "string") return false;
  if (!isTranslations(value.translations)) return false;
  if (!(typeof value.icon === "string" || value.icon === null)) return false;
  if (!(typeof value.limit === "number" || value.limit === null)) return false;
  if (!(typeof value.limitType === "string" || value.limitType === null)) return false;
  if (typeof value.itemCount !== "number") return false;
  return Array.isArray(value.items) && value.items.every(isFeedInventoryItem);
}

function isFeedInventoryItem(value: unknown): value is FeedInventoryItem {
  if (!isRecord(value)) return false;
  if (typeof value.id !== "number") return false;
  if (typeof value.name !== "string") return false;
  if (!isTranslations(value.translations)) return false;
  if (!(typeof value.limit === "number" || value.limit === null)) return false;
  if (!(typeof value.limitType === "string" || value.limitType === null)) return false;
  if (typeof value.updatedAt !== "string") return false;
  if (!isRecord(value.statusTags) || value.statusTags.inStock !== true) return false;
  if (typeof value.statusTags.limited !== "boolean" || typeof value.statusTags.clearance !== "boolean") {
    return false;
  }
  if (!isRecord(value.dietaryFlags)) return false;
  const dietaryFlags = value.dietaryFlags;
  return ["vegan", "vegetarian", "glutenFree", "organic", "halal", "kosher", "readyToEat"].every(
    (flag) => typeof dietaryFlags[flag] === "boolean",
  );
}
