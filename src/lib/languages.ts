// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

// Canonical list of supported display languages. Kept in a plain (non-"use
// client") module so both server code (e.g. the API route's Zod enum) and
// client components (language context, onboarding, the rotation editor) can
// share one source of truth. The order here is the canonical rotation/display
// order.

export const LANGUAGE_CODES = ["en", "zh", "es", "ru", "uk", "vi", "fa", "ar"] as const;

export type Language = (typeof LANGUAGE_CODES)[number];

export const LANGUAGE_OPTIONS: ReadonlyArray<{ code: Language; label: string }> = [
  { code: "en", label: "English" },
  { code: "zh", label: "中文" },
  { code: "es", label: "Español" },
  { code: "ru", label: "Русский" },
  { code: "uk", label: "Українська" },
  { code: "vi", label: "Tiếng Việt" },
  { code: "fa", label: "فارسی" },
  { code: "ar", label: "العربية" },
];

export function isLanguageCode(value: string): value is Language {
  return (LANGUAGE_CODES as readonly string[]).includes(value);
}

// --- Expanded language catalog (Feature 3 / FEED port) -------------------
//
// The eight entries above are the *hardcoded, always-on* base languages with
// fully authored translations (`src/contexts/language-context.tsx`). The
// catalog below mirrors FEED's 59-language `SUPPORTED_LANGUAGES` list and is
// the source set staff can enable from the admin Translation card. A catalog
// entry is keyed by its English `name` (the DB key, matching FEED and the
// `translations.language` column); `code` is the BCP-47 tag and `label` is the
// native display name. Enabling a non-base language persists the choice but the
// language only becomes client-visible once its translations are complete.

export type LanguageCatalogEntry = {
  /** BCP-47 language tag, e.g. "bs". */
  code: string;
  /** English name — the canonical DB key (matches FEED + translations.language). */
  name: string;
  /** Native display label shown in pickers. */
  label: string;
};

export const LANGUAGE_CATALOG: ReadonlyArray<LanguageCatalogEntry> = [
  { code: "en", name: "English", label: "English" },
  { code: "sq", name: "Albanian", label: "Shqip" },
  { code: "am", name: "Amharic", label: "አማርኛ" },
  { code: "ar", name: "Arabic", label: "العربية" },
  { code: "hy", name: "Armenian", label: "Հայերեն" },
  { code: "bn", name: "Bengali", label: "বাংলা" },
  { code: "bs", name: "Bosnian", label: "Bosanski" },
  { code: "bg", name: "Bulgarian", label: "Български" },
  { code: "my", name: "Burmese", label: "မြန်မာ" },
  { code: "ca", name: "Catalan", label: "Català" },
  { code: "zh", name: "Chinese", label: "中文" },
  { code: "hr", name: "Croatian", label: "Hrvatski" },
  { code: "cs", name: "Czech", label: "Čeština" },
  { code: "da", name: "Danish", label: "Dansk" },
  { code: "nl", name: "Dutch", label: "Nederlands" },
  { code: "et", name: "Estonian", label: "Eesti" },
  { code: "fi", name: "Finnish", label: "Suomi" },
  { code: "fr", name: "French", label: "Français" },
  { code: "ka", name: "Georgian", label: "ქართული" },
  { code: "de", name: "German", label: "Deutsch" },
  { code: "el", name: "Greek", label: "Ελληνικά" },
  { code: "gu", name: "Gujarati", label: "ગુજરાતી" },
  { code: "hi", name: "Hindi", label: "हिन्दी" },
  { code: "hu", name: "Hungarian", label: "Magyar" },
  { code: "is", name: "Icelandic", label: "Íslenska" },
  { code: "id", name: "Indonesian", label: "Bahasa Indonesia" },
  { code: "it", name: "Italian", label: "Italiano" },
  { code: "ja", name: "Japanese", label: "日本語" },
  { code: "kn", name: "Kannada", label: "ಕನ್ನಡ" },
  { code: "kk", name: "Kazakh", label: "Қазақ" },
  { code: "ko", name: "Korean", label: "한국어" },
  { code: "lv", name: "Latvian", label: "Latviešu" },
  { code: "lt", name: "Lithuanian", label: "Lietuvių" },
  { code: "mk", name: "Macedonian", label: "Македонски" },
  { code: "ms", name: "Malay", label: "Bahasa Melayu" },
  { code: "ml", name: "Malayalam", label: "മലയാളം" },
  { code: "mr", name: "Marathi", label: "मराठी" },
  { code: "mn", name: "Mongolian", label: "Монгол" },
  { code: "no", name: "Norwegian", label: "Norsk" },
  { code: "fa", name: "Persian", label: "فارسی" },
  { code: "pl", name: "Polish", label: "Polski" },
  { code: "pt", name: "Portuguese", label: "Português" },
  { code: "pa", name: "Punjabi", label: "ਪੰਜਾਬੀ" },
  { code: "ro", name: "Romanian", label: "Română" },
  { code: "ru", name: "Russian", label: "Русский" },
  { code: "sr", name: "Serbian", label: "Српски" },
  { code: "sk", name: "Slovak", label: "Slovenčina" },
  { code: "sl", name: "Slovenian", label: "Slovenščina" },
  { code: "so", name: "Somali", label: "Soomaali" },
  { code: "es", name: "Spanish", label: "Español" },
  { code: "sw", name: "Swahili", label: "Kiswahili" },
  { code: "sv", name: "Swedish", label: "Svenska" },
  { code: "tl", name: "Tagalog", label: "Tagalog" },
  { code: "ta", name: "Tamil", label: "தமிழ்" },
  { code: "te", name: "Telugu", label: "తెలుగు" },
  { code: "th", name: "Thai", label: "ไทย" },
  { code: "tr", name: "Turkish", label: "Türkçe" },
  { code: "uk", name: "Ukrainian", label: "Українська" },
  { code: "ur", name: "Urdu", label: "اردو" },
  { code: "vi", name: "Vietnamese", label: "Tiếng Việt" },
];

// English names of the eight always-on base languages (the LANGUAGE_OPTIONS
// above), used to keep them enabled and client-visible at all times.
export const ALWAYS_ON_LANGUAGE_NAMES: ReadonlyArray<string> = [
  "English",
  "Chinese",
  "Spanish",
  "Russian",
  "Ukrainian",
  "Vietnamese",
  "Persian",
  "Arabic",
];

const CATALOG_BY_NAME = new Map(LANGUAGE_CATALOG.map((entry) => [entry.name, entry]));

export function getCatalogEntryByName(name: string): LanguageCatalogEntry | undefined {
  return CATALOG_BY_NAME.get(name);
}

export function isValidLanguageName(name: string): boolean {
  return CATALOG_BY_NAME.has(name);
}
