// SPDX-License-Identifier: AGPL-3.0-or-later
import { afterEach, describe, expect, it, vi } from "vitest";
import { CATALOGUE, DEFAULT_MODEL_ID, findCatalogueEntry, selectableEntries } from "@/lib/ai/catalogue";
import { getModelNames, getModelSpecByModel } from "@/lib/ai/model-specs";
import { providerParameters } from "@/lib/ai/provider-parameters";
import { translateText, translateTextBatch, BatchResponseValidationError } from "@/lib/ai/translate";

vi.mock("@/lib/ai/system-prompt-store", () => ({ getActiveTranslationPrompt: vi.fn().mockResolvedValue(null) }));
afterEach(() => vi.unstubAllGlobals());

describe("FEED catalogue port", () => {
  it("offers the released presets and retains every rc.3 preset for editing", () => {
    expect(CATALOGUE).toHaveLength(27);
    expect(selectableEntries()).toHaveLength(12);
    expect(new Set(CATALOGUE.map((entry) => entry.id)).size).toBe(CATALOGUE.length);
    const oldIds = ["gpt-5-nano-2025-08-07", "gpt-5-mini-2025-08-07", "gpt-5-2025-08-07",
      "gpt-4.1-nano-2025-04-14", "gpt-4.1-mini-2025-04-14", "gpt-4.1-2025-04-14",
      "gpt-4o-mini-2024-07-18", "gpt-4o-2024-05-13", "claude-haiku-4-5-20251001",
      "claude-sonnet-4-5-20250929", "claude-opus-4-5-20251101", "gemini-2.5-flash-lite",
      "gemini-2.5-flash", "gemini-2.5-pro", "gemini-3-flash-preview", "gemini-3-pro-preview"];
    for (const id of oldIds) expect(getModelSpecByModel(id)?.model).toBe(id);
    expect(getModelNames("Google")).not.toContain("gemini-2.5-flash-lite");
    expect(getModelNames("Google")).toContain(DEFAULT_MODEL_ID);
    expect(getModelSpecByModel(DEFAULT_MODEL_ID)).toMatchObject({ inputPrice: 0.3, outputPrice: 2.5 });
    for (const entry of CATALOGUE) {
      if (entry.lifecycle.replacement) expect(findCatalogueEntry(entry.lifecycle.replacement)).toBeDefined();
    }
  });

  it("uses FEED's translation defaults and respects supported sampling", () => {
    expect(providerParameters({ serviceType: "OpenAI", model: "gpt-5.6-luna", temperature: 0 }, 2048))
      .toEqual({ max_completion_tokens: 2048, reasoning_effort: "none" });
    expect(providerParameters({ serviceType: "OpenAI", model: "gpt-6-astra" }, 2048))
      .toMatchObject({ reasoning_effort: "low" });
    expect(providerParameters({ serviceType: "Anthropic", model: "claude-sonnet-5" }, 2048))
      .toEqual({ max_tokens: 2048, thinking: { type: "disabled" } });
    expect(providerParameters({ serviceType: "Anthropic", model: "claude-fable-5-1" }, 2048))
      .toEqual({ max_tokens: 2048, thinking: { type: "adaptive" }, output_config: { effort: "low" } });
    expect(providerParameters({ serviceType: "Anthropic", model: "claude-haiku-4-5-20251001", temperature: 0, topP: 0.5 }, 2048))
      .toEqual({ max_tokens: 2048, temperature: 0 });
    expect(providerParameters({ serviceType: "Google", model: DEFAULT_MODEL_ID, temperature: 0, topP: 0 }, 2048))
      .toEqual({ maxOutputTokens: 2048, temperature: 1, topP: 0, thinkingConfig: { thinkingLevel: "MINIMAL" } });
    expect(providerParameters({ serviceType: "OpenAI", model: "gpt-4o-mini-2024-07-18", temperature: 0, topP: 0 }, 2048))
      .toEqual({ max_tokens: 2048, temperature: 0, top_p: 0 });
    expect(() => providerParameters({ serviceType: "Google", model: "gpt-5.6-luna" }, 2048)).toThrow("selected model");
    expect(providerParameters({ serviceType: "Anthropic", model: "claude-haiku-4-5-20251001", temperature: 2 }, 2048))
      .toMatchObject({ temperature: 1 });
  });
});

describe("single and batch serialized REST contracts", () => {
  it.each(selectableEntries())("uses the selected $id and bounded defaults on both paths", async (entry) => {
    const fetchMock = vi.fn(async (_url, init) => {
      const body = JSON.parse(init.body);
      const isBatch = entry.provider === "Google" ? Boolean(body.generationConfig.responseSchema)
        : entry.provider === "OpenAI" ? Boolean(body.response_format)
          : body.system.includes("translations array");
      const text = isBatch ? JSON.stringify({ translations: [{ id: "1", text: "Hola" }] }) : "Hola";
      return Response.json(entry.provider === "Google" ? { candidates: [{ content: { parts: [{ text }] } }] }
        : entry.provider === "OpenAI" ? { choices: [{ message: { content: text } }] }
          : { content: [{ type: "text", text }] });
    });
    vi.stubGlobal("fetch", fetchMock);
    const params = { serviceType: entry.provider, model: entry.id, apiKey: "secret-key", temperature: 0, topP: 0.4, maxTokens: 999999, thinkingLevel: "high" };
    expect((await translateText(params, "Hello", "Spanish")).text).toBe("Hola");
    expect((await translateTextBatch(params, [{ id: "1", text: "Hello" }], "Spanish")).translations[0].text).toBe("Hola");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    for (const [url, init] of fetchMock.mock.calls) {
      expect(url).not.toContain(params.apiKey);
      const body = JSON.parse(init.body);
      const options = entry.provider === "Google" ? body.generationConfig : body;
      if (entry.provider === "Google") expect(url).toContain(entry.id);
      else expect(body.model).toBe(entry.id);
      const budget = options.maxOutputTokens ?? options.max_completion_tokens ?? options.max_tokens;
      expect(budget).toBeLessThanOrEqual(16384);
      expect(JSON.stringify(options)).not.toMatch(/"(?:effort|reasoning_effort|thinkingLevel)":"(?:high|HIGH)"/);
      if (entry.capabilities.sampling === "unsupported") {
        expect(options.temperature).toBeUndefined();
        expect(options.top_p).toBeUndefined();
      }
    }
  });

  it("rejects truncated Google output before accepting even valid JSON", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ candidates: [{ finishReason: "MAX_TOKENS", content: { parts: [{ text: '{"translations":[{"id":"1","text":"Hola"}]}' }] } }] })));
    await expect(translateTextBatch({ serviceType: "Google", model: DEFAULT_MODEL_ID, apiKey: "key" }, [{ id: "1", text: "Hello" }], "Spanish"))
      .rejects.toBeInstanceOf(BatchResponseValidationError);
  });
});
