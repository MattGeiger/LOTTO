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
