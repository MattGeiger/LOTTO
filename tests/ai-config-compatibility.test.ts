// SPDX-License-Identifier: AGPL-3.0-or-later
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as fileStore from "@/lib/ai/ai-config-store-file";
import * as dbStore from "@/lib/ai/ai-config-store-db";
import { encryptApiKey, decryptApiKey } from "@/lib/ai/encryption";

let temporary: string | undefined;
afterEach(async () => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  if (temporary) await fs.rm(temporary, { recursive: true });
  temporary = undefined;
});

describe("rc.3 configuration storage compatibility", () => {
  it("round-trips a file-backed legacy configuration without changing its encrypted key or saved overrides", async () => {
    temporary = await fs.mkdtemp(path.join(os.tmpdir(), "lotto-ai-compat-"));
    vi.spyOn(process, "cwd").mockReturnValue(temporary);
    vi.stubEnv("ENCRYPTION_MASTER_KEY", Buffer.alloc(32, 1).toString("base64"));
    const encrypted = encryptApiKey("fixture-only-key");
    const prior = await fileStore.insert({
      name: "Legacy", serviceType: "Google", model: "gemini-2.5-flash-lite",
      encryptedApiKey: encrypted.encrypted, salt: encrypted.salt, inputCost: 0.123,
      outputCost: 0.456, unitPrice: "per_1k", temperature: 0, topP: 0,
      thinkingLevel: "high", maxTokens: 8192, inputTokenLimit: 1048576,
      outputTokenLimit: 65536, isActive: true,
    });
    await fileStore.update(prior.id, { name: "Legacy edited", isActive: false });
    const saved = await fileStore.get(prior.id);
    expect(saved).toMatchObject({ ...prior, name: "Legacy edited", isActive: false, updatedAt: expect.any(Number) });
    expect(decryptApiKey(saved!.encryptedApiKey!, saved!.salt!)).toBe("fixture-only-key");
    expect(await fileStore.list()).toHaveLength(1);
  });

  it("preserves the same legacy fields across the Neon adapter's read and update boundary", async () => {
    const row = {
      id: 9, name: "Legacy", service_type: "Google", model: "gemini-2.5-flash-lite",
      encrypted_api_key: "encrypted-fixture", salt: "salt-fixture", input_cost: "0.123",
      output_cost: "0.456", unit_price: "per_1k", temperature: "0", top_p: "0",
      thinking_level: "high", max_tokens: 8192, input_token_limit: 1048576,
      output_token_limit: 65536, is_active: true, created_at: "2026-09-01T00:00:00Z",
      updated_at: "2026-09-01T00:00:00Z",
    };
    const sql = vi.fn().mockResolvedValueOnce([row]).mockResolvedValueOnce([{ ...row, is_active: false }]);
    const saved = await dbStore.update(9, { isActive: false }, sql as never);
    expect(saved).toMatchObject({ model: row.model, inputCost: 0.123, outputCost: 0.456, unitPrice: "per_1k", temperature: 0, topP: 0, thinkingLevel: "high", encryptedApiKey: row.encrypted_api_key, salt: row.salt, isActive: false });
    const [statement, ...values] = sql.mock.calls[1];
    expect(String(statement)).toContain("UPDATE ai_configurations");
    expect(values).toEqual(["Legacy", "Google", row.model, row.encrypted_api_key, row.salt, 0.123, 0.456, "per_1k", 0, 0, "high", 8192, 1048576, 65536, false, 9]);
  });
});
