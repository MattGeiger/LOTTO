// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

import { beforeEach, describe, expect, it, vi } from "vitest";

const promptStore = vi.hoisted(() => ({
  getActiveTranslationPrompt: vi.fn(),
}));

vi.mock("@/lib/ai/system-prompt-store", () => promptStore);

describe("translateText system prompt selection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: "Hola" }] } }],
        usageMetadata: { promptTokenCount: 3, candidatesTokenCount: 2 },
      }),
    }) as unknown as typeof fetch;
  });

  it("uses the hardcoded translation prompt when no active prompt exists", async () => {
    promptStore.getActiveTranslationPrompt.mockResolvedValue(null);
    const { translateText } = await import("@/lib/ai/translate");

    await translateText({ serviceType: "Google", apiKey: "key", model: "gemini-test" }, "Hello", "Spanish");

    const body = JSON.parse(vi.mocked(global.fetch).mock.calls[0][1]?.body as string) as {
      systemInstruction: { parts: { text: string }[] };
    };
    expect(body.systemInstruction.parts[0].text).toContain("You are a professional translator");
    expect(body.systemInstruction.parts[0].text).toContain("Spanish");
  });

  it("uses the active system prompt when configured", async () => {
    promptStore.getActiveTranslationPrompt.mockResolvedValue({
      id: 1,
      name: "Visitor prompt",
      promptType: "UI_TRANSLATION",
      isActive: true,
      isDefault: false,
      description: "Use warm visitor-facing language.",
      translationApproach: "Keep instructions short.",
      contextGuidance: "Pantry ticketing context.",
      additionalGuidance: "Preserve Markdown.",
      temperature: 0.7,
      topP: 1,
      createdAt: 1,
      updatedAt: 1,
    });
    const { translateText } = await import("@/lib/ai/translate");

    await translateText({ serviceType: "Google", apiKey: "key", model: "gemini-test" }, "Hello", "Spanish");

    const body = JSON.parse(vi.mocked(global.fetch).mock.calls[0][1]?.body as string) as {
      systemInstruction: { parts: { text: string }[] };
    };
    expect(body.systemInstruction.parts[0].text).toContain("Use warm visitor-facing language.");
    expect(body.systemInstruction.parts[0].text).toContain("Pantry ticketing context.");
    expect(body.systemInstruction.parts[0].text).toContain("Spanish");
  });
});
