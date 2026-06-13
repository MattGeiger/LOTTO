// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

import { beforeEach, describe, expect, it, vi } from "vitest";

import { LANGUAGE_CATALOG } from "@/lib/languages";

// Query-aware neon mock: INSERT/UPDATE return [], SELECT returns the seeded set.
type Call = { text: string; values: unknown[] };
let calls: Call[];
let seeded: { name: string; is_enabled: boolean; sort_order: number }[];

const mockSql = vi.fn(async (strings: TemplateStringsArray, ...values: unknown[]) => {
  const text = strings.join(" ");
  calls.push({ text, values });
  if (/INSERT INTO languages/i.test(text)) {
    const [name, isEnabled, sortOrder] = values as [string, boolean, number];
    if (!seeded.some((row) => row.name === name)) {
      seeded.push({ name, is_enabled: isEnabled, sort_order: sortOrder });
    }
    return [];
  }
  if (/UPDATE languages/i.test(text)) {
    // Batched set-based updates: `SET is_enabled = true|false ... WHERE name = ANY($1)`.
    const enabled = /is_enabled = true/i.test(text);
    const names = (values[0] as string[]) ?? [];
    for (const name of names) {
      const row = seeded.find((r) => r.name === name);
      if (row) row.is_enabled = enabled;
    }
    return [];
  }
  if (/SELECT/i.test(text)) {
    return [...seeded].sort((a, b) => a.sort_order - b.sort_order);
  }
  return [];
});

vi.mock("@neondatabase/serverless", () => ({
  neon: vi.fn(() => mockSql),
}));

describe("languages store", () => {
  beforeEach(() => {
    calls = [];
    seeded = [];
    delete process.env.STATE_STORAGE;
    process.env.DATABASE_URL = "postgres://test";
    vi.clearAllMocks();
  });

  it("seeds the full 59-language catalog on first read", async () => {
    const { listLanguages } = await import("@/lib/translation/languages-store");
    const rows = await listLanguages();
    expect(rows).toHaveLength(LANGUAGE_CATALOG.length);
    expect(rows).toHaveLength(60);
    // English seeds enabled (a base language); Bosnian seeds disabled.
    expect(rows.find((r) => r.name === "English")?.isEnabled).toBe(true);
    expect(rows.find((r) => r.name === "Bosnian")?.isEnabled).toBe(false);
  });

  it("listEnabledLanguages returns only the eight base languages by default", async () => {
    const { listEnabledLanguages } = await import("@/lib/translation/languages-store");
    const rows = await listEnabledLanguages();
    expect(rows).toHaveLength(8);
    expect(rows.every((r) => r.isEnabled)).toBe(true);
  });

  it("bulkSetEnabled enables a new language", async () => {
    const { bulkSetEnabled } = await import("@/lib/translation/languages-store");
    const rows = await bulkSetEnabled([{ name: "Bosnian", isEnabled: true }]);
    expect(rows.find((r) => r.name === "Bosnian")?.isEnabled).toBe(true);
  });

  it("bulkSetEnabled cannot disable a base language", async () => {
    const { bulkSetEnabled } = await import("@/lib/translation/languages-store");
    const rows = await bulkSetEnabled([{ name: "English", isEnabled: false }]);
    expect(rows.find((r) => r.name === "English")?.isEnabled).toBe(true);
  });

  it("bulkSetEnabled ignores unknown language names", async () => {
    const { bulkSetEnabled } = await import("@/lib/translation/languages-store");
    await bulkSetEnabled([{ name: "Klingon", isEnabled: true }]);
    const updateCalls = calls.filter((c) => /UPDATE languages/i.test(c.text));
    expect(updateCalls).toHaveLength(0);
  });
});
