// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

import { beforeEach, describe, expect, it, vi } from "vitest";

const enabledLanguages = vi.fn();
vi.mock("@/lib/translation/languages-store", () => ({
  listEnabledLanguages: () => enabledLanguages(),
}));

let brandString: string | null = null;

// Mirrors the real getContentItems: 2 UI strings, optional visitor-facing brand
// copy, plus whatever inventory names the caller bridged in.
const getContentItems = vi.fn(async (options?: { inventoryNames?: string[] }) => {
  const names = options?.inventoryNames ?? [];
  const items: Array<{ originalText: string; type: "ui_string" | "brand_string" | "inventory" }> = [
    { originalText: "Now Serving", type: "ui_string" },
    { originalText: "Your ticket", type: "ui_string" },
  ];
  if (brandString) items.push({ originalText: brandString, type: "brand_string" });
  for (const name of names) items.push({ originalText: name, type: "inventory" });
  return {
    items,
    inventory: { names, ok: true, error: null, url: "https://feed.example/inventory.json" },
  };
});

vi.mock("@/lib/translation/content", () => ({
  getContentItems: (...args: unknown[]) => getContentItems(...args),
}));

/*
 * The language store is controlled per test so brand copy can be shown to
 * target the core languages as well as a dynamic language.
 */
const defaultLanguages = [
    { name: "English", isEnabled: true, sortOrder: 0 },
    { name: "Bosnian", isEnabled: true, sortOrder: 6 },
];

const storeList = vi.fn();
const storeUpsert = vi.fn();
vi.mock("@/lib/translation/translations-store", () => ({
  list: (...args: unknown[]) => storeList(...args),
  upsert: (...args: unknown[]) => storeUpsert(...args),
}));

const translatePending = vi.fn().mockResolvedValue({ translated: 2, failed: 0 });
vi.mock("@/lib/translation/engine", () => ({
  translatePending: () => translatePending(),
}));

describe("translation auditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    brandString = null;
    enabledLanguages.mockResolvedValue(defaultLanguages);
    storeList.mockResolvedValue([]);
    storeUpsert.mockResolvedValue({});
  });

  it("reports missing translations for enabled non-English languages", async () => {
    const { findMissing } = await import("@/lib/translation/auditor");
    const { details } = await findMissing(false);
    // 2 UI strings × 1 target language (Bosnian; English excluded) = 2 missing.
    expect(details.count).toBe(2);
    expect(details.byLanguage.Bosnian).toBe(2);
    expect(details.byType.ui_string).toBe(2);
    expect(storeUpsert).not.toHaveBeenCalled();
  });

  it("excludes already-completed translations", async () => {
    storeList.mockResolvedValue([
      {
        id: 1,
        originalText: "Now Serving",
        language: "Bosnian",
        type: "ui_string",
        status: "completed",
        updatedAt: Date.now(),
      },
    ]);
    const { findMissing } = await import("@/lib/translation/auditor");
    const { details } = await findMissing(false);
    expect(details.count).toBe(1); // only "Your ticket" remains
  });

  it("queues and translates when process=true", async () => {
    const { findMissing } = await import("@/lib/translation/auditor");
    const { processed } = await findMissing(true);
    expect(storeUpsert).toHaveBeenCalledTimes(2);
    expect(translatePending).toHaveBeenCalled();
    expect(processed).toEqual({ translated: 2, failed: 0 });
  });

  it("scans browser-bridged inventory names as inventory translations", async () => {
    const { findMissing } = await import("@/lib/translation/auditor");
    const { details } = await findMissing(false, undefined, ["Apples", "Rice"]);
    // The bridged names reach the content source unchanged.
    expect(getContentItems).toHaveBeenCalledWith({ inventoryNames: ["Apples", "Rice"] });
    // 2 UI strings + 2 inventory names, each missing for Bosnian (a non-core
    // target that needs DB translations FEED doesn't carry).
    expect(details.byType.inventory).toBe(2);
    expect(details.byType.ui_string).toBe(2);
    expect(details.byLanguage.Bosnian).toBe(4);
  });

  it("audits active brand copy for core and dynamic non-English languages", async () => {
    brandString = "Community Library Service For";
    enabledLanguages.mockResolvedValue([
      { name: "English", isEnabled: true, sortOrder: 0 },
      { name: "Spanish", isEnabled: true, sortOrder: 1 },
      { name: "Bosnian", isEnabled: true, sortOrder: 6 },
    ]);

    const { findMissing } = await import("@/lib/translation/auditor");
    const { details } = await findMissing(false);

    expect(details.byType.brand_string).toBe(2);
    expect(details.byLanguage.Spanish).toBe(1);
    // Bosnian also needs the two dynamic UI strings.
    expect(details.byLanguage.Bosnian).toBe(3);
    expect(details.count).toBe(4);
  });
});
