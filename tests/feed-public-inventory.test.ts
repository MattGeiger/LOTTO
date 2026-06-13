// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

import { describe, expect, it, vi } from "vitest";

import {
  fetchFeedPublicInventory,
  formatFeedLimit,
  getFeedDisplayName,
} from "@/lib/feed-public-inventory";

describe("FEED public inventory helpers", () => {
  it("fetches public inventory without credentials or browser cache", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      generatedAt: "2026-05-24T12:00:00.000Z",
      version: "1.2.2",
      languages: ["English", "Spanish"],
      categories: [],
      totals: { categories: 0, foodItems: 0 },
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await fetchFeedPublicInventory("https://example.test/inventory.json");

    expect(fetchMock).toHaveBeenCalledWith("https://example.test/inventory.json", {
      cache: "no-store",
      credentials: "omit",
      headers: { "User-Agent": "LOTTO/1.0 (+https://williamtemple.app)", Accept: "application/json" },
    });
  });

  it("uses matching FEED translations and falls back to English names", () => {
    expect(getFeedDisplayName({ name: "Rice", translations: { Spanish: "Arroz" } }, "es")).toBe("Arroz");
    expect(getFeedDisplayName({ name: "Rice", translations: {} }, "es")).toBe("Rice");
  });

  it("falls back to the production FEED endpoint when a configured endpoint fails", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("local FEED is unavailable"))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        generatedAt: "2026-05-24T12:00:00.000Z",
        version: "1.2.2",
        languages: ["English"],
        categories: [],
        totals: { categories: 0, foodItems: 0 },
      }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await fetchFeedPublicInventory("http://localhost:3001/api/public/inventory.json");

    const expectedInit = {
      cache: "no-store",
      credentials: "omit",
      headers: { "User-Agent": "LOTTO/1.0 (+https://williamtemple.app)", Accept: "application/json" },
    };
    expect(fetchMock).toHaveBeenNthCalledWith(1, "http://localhost:3001/api/public/inventory.json", expectedInit);
    expect(fetchMock).toHaveBeenNthCalledWith(2, "https://feed.williamtemple.app/api/public/inventory.json", expectedInit);
  });

  it("formats practical limit labels", () => {
    expect(formatFeedLimit(1, "household")).toBe("Limit 1 per household");
    expect(formatFeedLimit(2, "person")).toBe("Limit 2 per person");
    expect(formatFeedLimit(100, "household")).toBe("");
    expect(formatFeedLimit(null, "household")).toBe("");
  });
});
