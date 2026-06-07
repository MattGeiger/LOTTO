// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

import { beforeEach, describe, expect, it, vi } from "vitest";

const sampleRows = [
  { name: "English", isEnabled: true, sortOrder: 0 },
  { name: "Spanish", isEnabled: true, sortOrder: 49 },
  { name: "Bosnian", isEnabled: false, sortOrder: 6 },
];

vi.mock("@/lib/translation/languages-store", () => ({
  listLanguages: vi.fn().mockResolvedValue(sampleRows),
  listEnabledLanguages: vi.fn().mockResolvedValue(sampleRows.filter((r) => r.isEnabled)),
  bulkSetEnabled: vi.fn().mockResolvedValue(sampleRows),
}));

const makeGet = (search = "") =>
  new Request(`http://localhost:3000/api/languages${search}`, { method: "GET" });

const makePut = (body: unknown) =>
  new Request("http://localhost:3000/api/languages", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

describe("/api/languages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET returns the full catalog", async () => {
    const { GET } = await import("@/app/api/languages/route");
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const body = (await res.json()) as { languages: typeof sampleRows };
    expect(body.languages).toHaveLength(3);
  });

  it("GET ?enabled returns only enabled languages", async () => {
    const store = await import("@/lib/translation/languages-store");
    const { GET } = await import("@/app/api/languages/route");
    const res = await GET(makeGet("?enabled"));
    expect(res.status).toBe(200);
    expect(store.listEnabledLanguages).toHaveBeenCalled();
    const body = (await res.json()) as { languages: typeof sampleRows };
    expect(body.languages.every((row) => row.isEnabled)).toBe(true);
  });

  it("PUT applies a bulk update", async () => {
    const store = await import("@/lib/translation/languages-store");
    const { PUT } = await import("@/app/api/languages/route");
    const res = await PUT(makePut({ languages: [{ name: "Bosnian", isEnabled: true }] }));
    expect(res.status).toBe(200);
    expect(store.bulkSetEnabled).toHaveBeenCalledWith([{ name: "Bosnian", isEnabled: true }]);
  });

  it("PUT rejects a malformed body", async () => {
    const { PUT } = await import("@/app/api/languages/route");
    const res = await PUT(makePut({ languages: [{ name: "Bosnian" }] }));
    expect(res.status).toBe(400);
  });

  it("PUT rejects invalid JSON", async () => {
    const { PUT } = await import("@/app/api/languages/route");
    const res = await PUT(makePut("not json"));
    expect(res.status).toBe(400);
  });
});
