// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

import { beforeEach, describe, expect, it, vi } from "vitest";

const samplePrompt = {
  id: 1,
  name: "Visitor prompt",
  promptType: "UI_TRANSLATION" as const,
  isActive: true,
  isDefault: false,
  description: "Translate for visitors.",
  translationApproach: "Use plain language.",
  contextGuidance: "Pantry ticketing context.",
  additionalGuidance: "Preserve Markdown.",
  temperature: 0.7,
  topP: 1,
  createdAt: 1,
  updatedAt: 1,
};

vi.mock("@/lib/ai/system-prompt-store", () => ({
  list: vi.fn().mockResolvedValue([samplePrompt]),
  insert: vi.fn().mockResolvedValue(samplePrompt),
  update: vi.fn().mockResolvedValue(samplePrompt),
  remove: vi.fn().mockResolvedValue(true),
}));

const json = (body: unknown, url: string, method = "POST") =>
  new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

describe("/api/system-prompts", () => {
  beforeEach(() => vi.clearAllMocks());

  it("GET lists prompts", async () => {
    const { GET } = await import("@/app/api/system-prompts/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { prompts: unknown[] };
    expect(body.prompts).toHaveLength(1);
  });

  it("POST creates a translation prompt", async () => {
    const store = await import("@/lib/ai/system-prompt-store");
    const { POST } = await import("@/app/api/system-prompts/route");
    const res = await POST(
      json(
        {
          name: "Visitor prompt",
          promptType: "UI_TRANSLATION",
          description: "Translate for visitors.",
        },
        "http://localhost/api/system-prompts",
      ),
    );

    expect(res.status).toBe(201);
    expect(store.insert).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Visitor prompt", promptType: "UI_TRANSLATION" }),
    );
  });

  it("PUT updates a prompt", async () => {
    const store = await import("@/lib/ai/system-prompt-store");
    const { PUT } = await import("@/app/api/system-prompts/[id]/route");
    const res = await PUT(
      json(
        {
          name: "Updated prompt",
          promptType: "ANNOUNCEMENT_TRANSLATION",
          description: "Updated.",
        },
        "http://localhost/api/system-prompts/1",
        "PUT",
      ),
      { params: Promise.resolve({ id: "1" }) },
    );

    expect(res.status).toBe(200);
    expect(store.update).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ name: "Updated prompt", promptType: "ANNOUNCEMENT_TRANSLATION" }),
    );
  });

  it("DELETE removes a prompt", async () => {
    const store = await import("@/lib/ai/system-prompt-store");
    const { DELETE } = await import("@/app/api/system-prompts/[id]/route");
    const res = await DELETE(new Request("http://localhost/api/system-prompts/1", { method: "DELETE" }), {
      params: Promise.resolve({ id: "1" }),
    });

    expect(res.status).toBe(200);
    expect(store.remove).toHaveBeenCalledWith(1);
  });
});
