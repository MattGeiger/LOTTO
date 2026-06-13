// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/translation/languages-store", () => ({
  listEnabledLanguages: vi.fn().mockResolvedValue([
    { name: "English", isEnabled: true, sortOrder: 0 },
    { name: "Bosnian", isEnabled: true, sortOrder: 6 },
  ]),
}));

vi.mock("@/lib/translation/content", () => ({
  getContentItems: vi.fn().mockResolvedValue({
    items: [
      { originalText: "Now Serving", type: "ui_string" },
      { originalText: "Your ticket", type: "ui_string" },
    ],
    inventory: { names: [], ok: true, error: null, url: "https://feed.example/inventory.json" },
  }),
}));

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
});
