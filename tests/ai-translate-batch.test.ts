// SPDX-License-Identifier: AGPL-3.0-or-later

import { beforeEach, describe, expect, it, vi } from "vitest";

const promptStore = vi.hoisted(() => ({
  getActiveTranslationPrompt: vi.fn(),
}));

vi.mock("@/lib/ai/system-prompt-store", () => promptStore);

describe("structured batch translation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    promptStore.getActiveTranslationPrompt.mockResolvedValue(null);
  });

  it("sends one schema-constrained Gemini request for multiple rows", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      translations: [
                        { id: "11", text: "Nastavi" },
                        { id: "12", text: "Trenutno uslužujemo" },
                      ],
                    }),
                  },
                ],
              },
            },
          ],
          usageMetadata: { promptTokenCount: 120, candidatesTokenCount: 20 },
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { translateTextBatch } = await import("@/lib/ai/translate");

    const result = await translateTextBatch(
      {
        serviceType: "Google",
        apiKey: "secret",
        model: "gemini-2.5-flash-lite",
        maxTokens: 8_192,
      },
      [
        { id: "11", text: "Continue" },
        { id: "12", text: "Now Serving" },
      ],
      "Bosnian",
    );

    expect(result.translations).toEqual([
      { id: "11", text: "Nastavi" },
      { id: "12", text: "Trenutno uslužujemo" },
    ]);
    expect(result.maxOutputTokens).toBe(2_048);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(promptStore.getActiveTranslationPrompt).toHaveBeenCalledTimes(1);

    const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string) as {
      contents: Array<{ parts: Array<{ text: string }> }>;
      generationConfig: {
        maxOutputTokens: number;
        responseMimeType: string;
        responseSchema: unknown;
      };
    };
    expect(JSON.parse(body.contents[0].parts[0].text)).toEqual({
      items: [
        { id: "11", text: "Continue" },
        { id: "12", text: "Now Serving" },
      ],
    });
    expect(body.generationConfig).toMatchObject({
      maxOutputTokens: 2_048,
      responseMimeType: "application/json",
    });
    expect(body.generationConfig.responseSchema).toBeTruthy();
  });

  it("accepts a fenced JSON response but restores requested id order", async () => {
    const { parseBatchTranslations } = await import("@/lib/ai/translate");
    expect(
      parseBatchTranslations(
        '```json\n{"translations":[{"id":"2","text":"Dva"},{"id":"1","text":"Jedan"}]}\n```',
        [
          { id: "1", text: "One" },
          { id: "2", text: "Two" },
        ],
      ),
    ).toEqual([
      { id: "1", text: "Jedan" },
      { id: "2", text: "Dva" },
    ]);
  });

  it("rejects missing, duplicate, or invented ids before persistence", async () => {
    const { parseBatchTranslations } = await import("@/lib/ai/translate");
    const expected = [
      { id: "1", text: "One" },
      { id: "2", text: "Two" },
    ];
    expect(() =>
      parseBatchTranslations('{"translations":[{"id":"1","text":"Jedan"}]}', expected),
    ).toThrow("omitted");
    expect(() =>
      parseBatchTranslations(
        '{"translations":[{"id":"1","text":"Jedan"},{"id":"1","text":"Opet"}]}',
        expected,
      ),
    ).toThrow("duplicated");
    expect(() =>
      parseBatchTranslations(
        '{"translations":[{"id":"1","text":"Jedan"},{"id":"3","text":"Tri"}]}',
        expected,
      ),
    ).toThrow("identifier");
  });
});
