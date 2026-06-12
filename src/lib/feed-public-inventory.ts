// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

import type { Language } from "@/contexts/language-context";
import { getCatalogEntryByCode } from "@/lib/languages";

export const DEFAULT_FEED_PUBLIC_INVENTORY_URL =
  "https://feed.williamtemple.app/api/public/inventory.json";

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

export function getFeedPublicInventoryUrl(): string {
  return normalizeFeedPublicInventoryUrl(process.env.NEXT_PUBLIC_FEED_PUBLIC_INVENTORY_URL);
}

function normalizeFeedPublicInventoryUrl(configuredUrl: string | undefined): string {
  const trimmedUrl = configuredUrl?.trim();
  if (!trimmedUrl) return DEFAULT_FEED_PUBLIC_INVENTORY_URL;

  if (typeof window !== "undefined") {
    try {
      const parsedUrl = new URL(trimmedUrl);
      const appHost = window.location.hostname;
      const appIsLocal = appHost === "localhost" || appHost === "127.0.0.1" || appHost === "::1";
      const feedIsLocal = parsedUrl.hostname === "localhost" || parsedUrl.hostname === "127.0.0.1" || parsedUrl.hostname === "::1";
      if (feedIsLocal && !appIsLocal) return DEFAULT_FEED_PUBLIC_INVENTORY_URL;
    } catch {
      return DEFAULT_FEED_PUBLIC_INVENTORY_URL;
    }
  }

  return trimmedUrl;
}

export function getFeedDisplayName(entity: TranslatedFeedEntity, language: Language): string {
  // Core codes use the explicit FEED-name map; dynamic catalog languages map
  // code → English name (FEED keys its public translations by language name),
  // so inventory already translated in FEED shows up for newly enabled languages.
  const feedLanguage = feedLanguageByLottoLanguage[language] ?? getCatalogEntryByCode(language)?.name ?? "";
  const translatedName = entity.translations[feedLanguage];
  return translatedName && translatedName.trim().length > 0 ? translatedName : entity.name;
}

export function formatFeedLimit(limit: number | null | undefined, limitType: FeedLimitType | null | undefined): string {
  if (limit == null || !Number.isFinite(limit) || limit <= 0 || limit >= 100) return "";
  if (limitType === "person") return `Limit ${limit} per person`;
  if (limitType === "household") return `Limit ${limit} per household`;
  return `Limit ${limit}`;
}

export async function fetchFeedPublicInventory(
  url: string = getFeedPublicInventoryUrl(),
): Promise<FeedPublicInventory> {
  try {
    return await fetchFeedPublicInventoryFromUrl(url);
  } catch (error) {
    if (url === DEFAULT_FEED_PUBLIC_INVENTORY_URL) throw error;
    return fetchFeedPublicInventoryFromUrl(DEFAULT_FEED_PUBLIC_INVENTORY_URL);
  }
}

async function fetchFeedPublicInventoryFromUrl(url: string): Promise<FeedPublicInventory> {
  const response = await fetch(url, {
    cache: "no-store",
    credentials: "omit",
  });

  if (!response.ok) {
    throw new Error("Unable to load current inventory.");
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
