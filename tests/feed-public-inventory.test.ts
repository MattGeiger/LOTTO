// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  fetchFeedPublicInventory,
  formatFeedLimit,
  getFeedDisplayName,
} from "@/lib/feed-public-inventory";

const okInventory = () =>
  new Response(
    JSON.stringify({
      generatedAt: "2026-05-24T12:00:00.000Z",
      version: "1.2.2",
      languages: ["English", "Spanish"],
      categories: [],
      totals: { categories: 0, foodItems: 0 },
    }),
    { status: 200 },
  );

describe("FEED public inventory helpers", () => {
  // Restore any stubbed globals (notably `window`) so the server-branch test
  // doesn't leak `window === undefined` into the browser-branch tests.
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches public inventory without credentials or browser cache", async () => {
    const fetchMock = vi.fn(async () => okInventory());
    vi.stubGlobal("fetch", fetchMock);

    await fetchFeedPublicInventory("https://example.test/inventory.json");

    // jsdom defines `window`, so this exercises the BROWSER branch.
    expect(fetchMock).toHaveBeenCalledWith("https://example.test/inventory.json", {
      cache: "no-store",
      credentials: "omit",
      headers: { Accept: "application/json" },
    });
  });

  // Regression guard for ISSUES.md Issue 23: a non-safelisted request header on
  // the cross-origin browser fetch triggers a CORS preflight that FEED rejects
  // (it only allows `Content-Type`), which blocked the visitor inventory page
  // and the admin name bridge. The browser fetch MUST stay a "simple request".
  it("never sends a non-CORS-safelisted header (e.g. User-Agent) from the browser", async () => {
    const fetchMock = vi.fn(async () => okInventory());
    vi.stubGlobal("fetch", fetchMock);

    await fetchFeedPublicInventory("https://example.test/inventory.json");

    const SAFELISTED = new Set(["accept", "accept-language", "content-language", "content-type", "range"]);
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const headerNames = Object.keys((init.headers ?? {}) as Record<string, string>);
    expect(headerNames.length).toBeGreaterThan(0);
    for (const name of headerNames) {
      expect(SAFELISTED.has(name.toLowerCase())).toBe(true);
    }
  });

  it("does send a User-Agent on the server (Node/undici sends none by default)", async () => {
    const fetchMock = vi.fn(async () => okInventory());
    vi.stubGlobal("fetch", fetchMock);
    // Simulate a server runtime: `typeof window === "undefined"`.
    vi.stubGlobal("window", undefined);

    await fetchFeedPublicInventory("https://example.test/inventory.json");

    expect(fetchMock).toHaveBeenCalledWith("https://example.test/inventory.json", {
      cache: "no-store",
      credentials: "omit",
      headers: { Accept: "application/json", "User-Agent": "LOTTO/1.0 (+https://williamtemple.app)" },
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
      .mockResolvedValueOnce(okInventory());
    vi.stubGlobal("fetch", fetchMock);

    await fetchFeedPublicInventory("http://localhost:3001/api/public/inventory.json");

    // Browser branch (jsdom): no User-Agent on either attempt.
    const expectedInit = {
      cache: "no-store",
      credentials: "omit",
      headers: { Accept: "application/json" },
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
