// SPDX-License-Identifier: AGPL-3.0-or-later

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  class BatchResponseValidationError extends Error {}
  return {
    BatchResponseValidationError,
    getActiveConfig: vi.fn(),
    decryptApiKey: vi.fn(),
    translateTextBatch: vi.fn(),
    list: vi.fn(),
    get: vi.fn(),
    bulkUpdate: vi.fn(),
  };
});

vi.mock("@/lib/ai/ai-config-service", () => ({ getActiveConfig: mocks.getActiveConfig }));
vi.mock("@/lib/ai/encryption", () => ({ decryptApiKey: mocks.decryptApiKey }));
vi.mock("@/lib/ai/translate", () => ({
  BatchResponseValidationError: mocks.BatchResponseValidationError,
  translateTextBatch: mocks.translateTextBatch,
}));
vi.mock("@/lib/translation/translations-store", () => ({
  list: mocks.list,
  get: mocks.get,
  bulkUpdate: mocks.bulkUpdate,
}));

const row = (id: number, type: "ui_string" | "brand_string" = "ui_string") => ({
  id,
  originalText: `Source ${id}`,
  translatedText: null,
  status: "pending" as const,
  language: "Bosnian",
  type,
  metadata: null,
  promptTokens: null,
  completionTokens: null,
  totalCost: null,
  createdAt: 1,
  updatedAt: 1,
});

describe("translation engine batching", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getActiveConfig.mockResolvedValue({
      serviceType: "Google",
      model: "gemini-2.5-flash-lite",
      encryptedApiKey: "encrypted",
      salt: "salt",
      maxTokens: 65_536,
      inputTokenLimit: 1_048_576,
      outputTokenLimit: 65_536,
      temperature: 0.7,
      inputCost: 0.1,
      outputCost: 0.4,
      unitPrice: "per_1m",
    });
    mocks.decryptApiKey.mockReturnValue("key");
    mocks.bulkUpdate.mockImplementation(async (patches: unknown[]) => patches);
  });

  it("translates 100 same-language rows with one provider request and one store write", async () => {
    const pending = Array.from({ length: 100 }, (_, index) => row(index + 1));
    mocks.list.mockResolvedValue(pending);
    mocks.translateTextBatch.mockImplementation(async (params, items) => ({
      translations: items.map((item: { id: string }) => ({
        id: item.id,
        text: `Translated ${item.id}`,
      })),
      promptTokens: 1_000,
      completionTokens: 500,
      maxOutputTokens: 8_192,
      params,
    }));
    const { translatePending } = await import("@/lib/translation/engine");

    const result = await translatePending();

    expect(result).toEqual({
      translated: 100,
      failed: 0,
      remaining: 0,
      providerRequests: 1,
    });
    expect(mocks.translateTextBatch).toHaveBeenCalledTimes(1);
    expect(mocks.translateTextBatch.mock.calls[0][1]).toHaveLength(100);
    expect(mocks.translateTextBatch.mock.calls[0][0].maxTokens).toBe(8_192);
    expect(mocks.bulkUpdate).toHaveBeenCalledTimes(1);
    const patches = mocks.bulkUpdate.mock.calls[0][0] as Array<{
      promptTokens: number;
      completionTokens: number;
      metadata: { batchSize: number };
    }>;
    expect(patches).toHaveLength(100);
    expect(patches.reduce((sum, patch) => sum + patch.promptTokens, 0)).toBe(1_000);
    expect(patches.reduce((sum, patch) => sum + patch.completionTokens, 0)).toBe(500);
    expect(patches.every((patch) => patch.metadata.batchSize === 100)).toBe(true);
  });

  it("splits an invalid structured response once without retrying HTTP failures", async () => {
    const pending = Array.from({ length: 4 }, (_, index) => row(index + 1));
    mocks.list.mockResolvedValue(pending);
    mocks.translateTextBatch
      .mockRejectedValueOnce(new mocks.BatchResponseValidationError("invalid batch"))
      .mockImplementation(async (_params, items) => ({
        translations: items.map((item: { id: string }) => ({ id: item.id, text: `T${item.id}` })),
        promptTokens: 10,
        completionTokens: 8,
        maxOutputTokens: 2_048,
      }));
    const { translatePending } = await import("@/lib/translation/engine");

    await expect(translatePending()).resolves.toMatchObject({
      translated: 4,
      failed: 0,
      providerRequests: 3,
    });
    expect(mocks.translateTextBatch).toHaveBeenCalledTimes(3);
    expect(mocks.bulkUpdate).toHaveBeenCalledTimes(2);

    vi.clearAllMocks();
    mocks.getActiveConfig.mockResolvedValue({
      serviceType: "Google",
      model: "gemini-2.5-flash-lite",
      encryptedApiKey: "encrypted",
      salt: "salt",
      maxTokens: 8_192,
      outputTokenLimit: 65_536,
      inputCost: 0.1,
      outputCost: 0.4,
      unitPrice: "per_1m",
    });
    mocks.decryptApiKey.mockReturnValue("key");
    mocks.list.mockResolvedValue(pending);
    mocks.translateTextBatch.mockRejectedValue(new Error("HTTP 429"));
    mocks.bulkUpdate.mockImplementation(async (patches: unknown[]) => patches);

    await expect(translatePending()).resolves.toMatchObject({
      translated: 0,
      failed: 4,
      providerRequests: 1,
    });
    expect(mocks.translateTextBatch).toHaveBeenCalledTimes(1);
    expect(mocks.bulkUpdate).toHaveBeenCalledTimes(1);
  });
});
