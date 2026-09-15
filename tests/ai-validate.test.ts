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
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ id: "claude-sonnet-5" }), { status })));

describe("validateApiKey", () => {
  it("returns ok for a 200 from the provider", async () => {
    stubFetch(200);
    const result = await validateApiKey("Anthropic", "sk-test", "claude-sonnet-5");
    expect(result.ok).toBe(true);
    expect(result.message).toContain("Generation access and available credit were not tested");
  });

  it("reports an unauthorized key on 401", async () => {
    stubFetch(401);
    const result = await validateApiKey("OpenAI", "bad", "gpt-5.6-luna");
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/rejected the API key or selected model/i);
  });

  it("reports rate limiting on 429", async () => {
    stubFetch(429);
    const result = await validateApiKey("Google", "key", "gemini-3.5-flash-lite");
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
    const result = await validateApiKey("Anthropic", "sk-test", "claude-sonnet-5");
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/could not complete/i);
  });

  it("hits the correct endpoint per provider", async () => {
    const fetchMock = vi.fn(async () => new Response("", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await validateApiKey("OpenAI", "secret", "gpt-5.6-luna");
    await validateApiKey("Anthropic", "secret", "claude-sonnet-5");
    await validateApiKey("Google", "secret", "gemini-3.5-flash-lite");
    const urls = fetchMock.mock.calls.map((c: unknown[]) => String(c[0]));
    expect(urls[0]).toBe("https://api.openai.com/v1/models/gpt-5.6-luna");
    expect(urls[1]).toBe("https://api.anthropic.com/v1/models/claude-sonnet-5");
    expect(urls[2]).toBe("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite");
    expect(urls.join()).not.toContain("secret");
  });

  it("distinguishes exhausted quota from busy and redacts provider details", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response('insufficient_quota secret-value proj-private', { status: 429 })));
    const result = await validateApiKey("OpenAI", "secret-value", "gpt-5.6-luna");
    expect(result.message).toContain("API portal");
    expect(JSON.stringify(result)).not.toMatch(/secret-value|proj-private/);
  });

  it("does not accept an empty 200 response as model visibility", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({})));
    expect((await validateApiKey("Google", "key", "gemini-3.5-flash-lite")).ok).toBe(false);
  });

  it("requires a selected model and rejects cross-provider models before fetching", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect((await validateApiKey("Google", "key")).ok).toBe(false);
    expect((await validateApiKey("Google", "key", "gpt-5.6-luna")).ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
