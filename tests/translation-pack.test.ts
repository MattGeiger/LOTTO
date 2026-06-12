// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/ui-strings", () => ({
  UI_STRINGS_EN: {
    nowServing: "Now Serving",
    yourTicket: "Your ticket",
    // Two keys sharing one source string — one translation row covers both.
    closeA: "Close",
    closeB: "Close",
  },
}));

const storeList = vi.fn();
vi.mock("@/lib/translation/translations-store", () => ({
  list: (...args: unknown[]) => storeList(...args),
}));

const enabledLanguages = vi.fn();
vi.mock("@/lib/translation/languages-store", () => ({
  listEnabledLanguages: () => enabledLanguages(),
}));

const loadState = vi.fn();
vi.mock("@/lib/state-manager", () => ({
  stateManager: { loadState: () => loadState() },
}));

const row = (originalText: string, translatedText: string, type = "ui_string") => ({
  id: Math.random(),
  originalText,
  translatedText,
  status: "completed" as const,
  language: "Bosnian",
  type,
  metadata: null,
  promptTokens: null,
  completionTokens: null,
  totalCost: null,
  createdAt: 1,
  updatedAt: 1,
});

describe("language packs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadState.mockResolvedValue({ announcement: null });
    enabledLanguages.mockResolvedValue([
      { name: "English", isEnabled: true, sortOrder: 0 },
      { name: "Bosnian", isEnabled: true, sortOrder: 6 },
    ]);
  });

  it("builds a key→translation map from completed rows", async () => {
    storeList.mockResolvedValue([
      row("Now Serving", "Sada poslužujemo"),
      row("Close", "Zatvori"),
    ]);
    const { buildLanguagePack } = await import("@/lib/translation/pack");
    const pack = await buildLanguagePack("bs");
    expect(pack?.name).toBe("Bosnian");
    expect(pack?.uiStrings.nowServing).toBe("Sada poslužujemo");
    // Shared source text resolves for every key using it.
    expect(pack?.uiStrings.closeA).toBe("Zatvori");
    expect(pack?.uiStrings.closeB).toBe("Zatvori");
    // Untranslated key absent (client falls back to English).
    expect(pack?.uiStrings.yourTicket).toBeUndefined();
  });

  it("returns null for an unknown code", async () => {
    const { buildLanguagePack } = await import("@/lib/translation/pack");
    expect(await buildLanguagePack("xx")).toBeNull();
  });

  it("includes the translated active announcement", async () => {
    loadState.mockResolvedValue({
      announcement: { enabled: true, markdown: "Pantry closes at 3 PM.", startsAt: null, endsAt: null, updatedAt: 1 },
    });
    storeList.mockResolvedValue([
      row("Pantry closes at 3 PM.", "Smočnica se zatvara u 15h.", "announcement"),
    ]);
    const { buildLanguagePack } = await import("@/lib/translation/pack");
    const pack = await buildLanguagePack("bs");
    expect(pack?.announcement).toBe("Smočnica se zatvara u 15h.");
  });

  it("marks a language ready only when every UI source is completed", async () => {
    const { isLanguageReady } = await import("@/lib/translation/pack");
    // Missing "Your ticket" → not ready.
    storeList.mockResolvedValue([row("Now Serving", "x"), row("Close", "y")]);
    expect(await isLanguageReady("Bosnian")).toBe(false);
    // All three distinct sources present → ready.
    storeList.mockResolvedValue([
      row("Now Serving", "x"),
      row("Close", "y"),
      row("Your ticket", "z"),
    ]);
    expect(await isLanguageReady("Bosnian")).toBe(true);
  });

  it("core languages are always ready", async () => {
    const { isLanguageReady } = await import("@/lib/translation/pack");
    storeList.mockResolvedValue([]);
    expect(await isLanguageReady("Spanish")).toBe(true);
  });

  it("listClientLanguages = core eight plus ready dynamic languages", async () => {
    // Bosnian fully translated.
    storeList.mockResolvedValue([
      row("Now Serving", "x"),
      row("Close", "y"),
      row("Your ticket", "z"),
    ]);
    const { listClientLanguages } = await import("@/lib/translation/pack");
    const options = await listClientLanguages();
    expect(options).toHaveLength(9);
    expect(options[0].code).toBe("en");
    expect(options.at(-1)).toMatchObject({ code: "bs", name: "Bosnian", label: "Bosanski" });
  });

  it("listClientLanguages excludes enabled-but-incomplete languages", async () => {
    storeList.mockResolvedValue([row("Now Serving", "x")]); // incomplete
    const { listClientLanguages } = await import("@/lib/translation/pack");
    const options = await listClientLanguages();
    expect(options).toHaveLength(8);
    expect(options.some((o) => o.code === "bs")).toBe(false);
  });
});
