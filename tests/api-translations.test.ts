// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

import { beforeEach, describe, expect, it, vi } from "vitest";

const sampleRow = {
  id: 1,
  originalText: "Now Serving",
  translatedText: "Sada poslužujemo",
  status: "completed" as const,
  language: "Bosnian",
  type: "ui_string" as const,
  metadata: null,
  promptTokens: null,
  completionTokens: null,
  totalCost: null,
  createdAt: 1,
  updatedAt: 1,
};

vi.mock("@/lib/translation/translations-store", () => ({
  list: vi.fn().mockResolvedValue([sampleRow]),
  get: vi.fn().mockResolvedValue(sampleRow),
  upsert: vi.fn().mockResolvedValue({ ...sampleRow, status: "pending", translatedText: null }),
  update: vi.fn().mockResolvedValue(sampleRow),
  remove: vi.fn().mockResolvedValue(true),
  bulkRemove: vi.fn().mockResolvedValue(2),
}));

vi.mock("@/lib/translation/engine", () => ({
  translateRowsByIds: vi.fn().mockResolvedValue({ translated: 1, failed: 0 }),
  translatePending: vi.fn().mockResolvedValue({ translated: 1, failed: 0 }),
  NoActiveConfigError: class NoActiveConfigError extends Error {},
}));

vi.mock("@/lib/translation/auditor", () => ({
  findMissing: vi.fn().mockResolvedValue({
    details: { count: 1, byType: { ui_string: 1 }, byLanguage: { Bosnian: 1 }, sampleItems: [] },
    processed: { translated: 1, failed: 0 },
  }),
}));

vi.mock("@/lib/translation/recovery", () => ({
  recoverStuck: vi.fn().mockResolvedValue({ recovered: 1, translated: 1, failed: 0 }),
}));

const json = (body: unknown, url: string, method = "POST") =>
  new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

describe("/api/translations", () => {
  beforeEach(() => vi.clearAllMocks());

  it("GET lists translations", async () => {
    const { GET } = await import("@/app/api/translations/route");
    const res = await GET(new Request("http://localhost/api/translations"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { translations: unknown[] };
    expect(body.translations).toHaveLength(1);
  });

  it("POST adds a custom translation", async () => {
    const { POST } = await import("@/app/api/translations/route");
    const res = await POST(json({ originalText: "Hi", language: "Bosnian" }, "http://localhost/api/translations"));
    expect(res.status).toBe(201);
  });

  it("POST adds custom translations for multiple target languages", async () => {
    const store = await import("@/lib/translation/translations-store");
    const engine = await import("@/lib/translation/engine");
    vi.mocked(store.upsert)
      .mockResolvedValueOnce({ ...sampleRow, id: 10, language: "Bosnian", status: "pending", translatedText: null })
      .mockResolvedValueOnce({ ...sampleRow, id: 11, language: "Spanish", status: "pending", translatedText: null });
    vi.mocked(store.get)
      .mockResolvedValueOnce({ ...sampleRow, id: 10, language: "Bosnian" })
      .mockResolvedValueOnce({ ...sampleRow, id: 11, language: "Spanish" });

    const { POST } = await import("@/app/api/translations/route");
    const res = await POST(
      json(
        { originalText: "Welcome", targetLanguages: ["Bosnian", "Spanish"] },
        "http://localhost/api/translations",
      ),
    );

    expect(res.status).toBe(201);
    expect(store.upsert).toHaveBeenCalledTimes(2);
    expect(engine.translateRowsByIds).toHaveBeenCalledWith([10, 11]);
    const body = (await res.json()) as { translations: unknown[] };
    expect(body.translations).toHaveLength(2);
  });

  it("PUT applies a correction", async () => {
    const { PUT } = await import("@/app/api/translations/[id]/route");
    const res = await PUT(json({ translatedText: "fixed" }, "http://localhost/api/translations/1", "PUT"), {
      params: Promise.resolve({ id: "1" }),
    });
    expect(res.status).toBe(200);
  });

  it("DELETE removes a translation", async () => {
    const { DELETE } = await import("@/app/api/translations/[id]/route");
    const res = await DELETE(new Request("http://localhost/api/translations/1", { method: "DELETE" }), {
      params: Promise.resolve({ id: "1" }),
    });
    expect(res.status).toBe(200);
  });

  it("retry re-runs a translation", async () => {
    const { POST } = await import("@/app/api/translations/[id]/retry/route");
    const res = await POST(new Request("http://localhost/api/translations/1/retry", { method: "POST" }), {
      params: Promise.resolve({ id: "1" }),
    });
    expect(res.status).toBe(200);
  });

  it("find-missing returns details", async () => {
    const { POST } = await import("@/app/api/translations/find-missing/route");
    const res = await POST(json({ process: false }, "http://localhost/api/translations/find-missing"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { details: { count: number } };
    expect(body.details.count).toBe(1);
  });

  it("recover-stuck runs recovery", async () => {
    const { POST } = await import("@/app/api/translations/recover-stuck/route");
    const res = await POST();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { recovered: number };
    expect(body.recovered).toBe(1);
  });

  it("bulk-delete removes rows", async () => {
    const { POST } = await import("@/app/api/translations/bulk-delete/route");
    const res = await POST(json({ ids: [1, 2] }, "http://localhost/api/translations/bulk-delete"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { removed: number };
    expect(body.removed).toBe(2);
  });
});
