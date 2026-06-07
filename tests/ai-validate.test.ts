// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

import { afterEach, describe, expect, it, vi } from "vitest";

import { validateApiKey } from "@/lib/ai/validate";

afterEach(() => {
  vi.unstubAllGlobals();
});

const stubFetch = (status: number) =>
  vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status })));

describe("validateApiKey", () => {
  it("returns ok for a 200 from the provider", async () => {
    stubFetch(200);
    const result = await validateApiKey("Anthropic", "sk-test");
    expect(result.ok).toBe(true);
  });

  it("reports an unauthorized key on 401", async () => {
    stubFetch(401);
    const result = await validateApiKey("OpenAI", "bad");
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/unauthorized/i);
  });

  it("reports rate limiting on 429", async () => {
    stubFetch(429);
    const result = await validateApiKey("Google", "key");
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/rate limited/i);
  });

  it("fails fast without a key", async () => {
    const result = await validateApiKey("OpenAI", "");
    expect(result.ok).toBe(false);
  });

  it("handles network errors gracefully", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("boom");
    }));
    const result = await validateApiKey("Anthropic", "sk-test");
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/could not reach/i);
  });

  it("hits the correct endpoint per provider", async () => {
    const fetchMock = vi.fn(async () => new Response("", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await validateApiKey("OpenAI", "k");
    await validateApiKey("Anthropic", "k");
    await validateApiKey("Google", "k");
    const urls = fetchMock.mock.calls.map((c) => String(c[0]));
    expect(urls[0]).toContain("api.openai.com");
    expect(urls[1]).toContain("api.anthropic.com");
    expect(urls[2]).toContain("generativelanguage.googleapis.com");
  });
});
