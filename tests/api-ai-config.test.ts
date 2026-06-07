// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

import { beforeEach, describe, expect, it, vi } from "vitest";

const publicConfig = {
  id: 1,
  name: "Primary",
  serviceType: "Anthropic" as const,
  model: "claude-sonnet-4-5",
  inputCost: 3,
  outputCost: 15,
  unitPrice: "per_1m" as const,
  temperature: null,
  topP: null,
  thinkingLevel: null,
  maxTokens: null,
  inputTokenLimit: null,
  outputTokenLimit: null,
  isActive: true,
  createdAt: 1,
  updatedAt: 1,
  hasApiKey: true,
};

vi.mock("@/lib/ai/ai-config-service", () => ({
  listConfigs: vi.fn().mockResolvedValue([publicConfig]),
  createConfig: vi.fn().mockResolvedValue(publicConfig),
  updateConfig: vi.fn().mockResolvedValue(publicConfig),
  deleteConfig: vi.fn().mockResolvedValue(true),
  getConfig: vi.fn().mockResolvedValue({ ...publicConfig, serviceType: "Anthropic" }),
  getDecryptedApiKey: vi.fn().mockResolvedValue("sk-stored"),
}));

let encryptionConfigured = true;
vi.mock("@/lib/ai/encryption", () => ({
  isEncryptionConfigured: () => encryptionConfigured,
}));

vi.mock("@/lib/ai/validate", () => ({
  validateApiKey: vi.fn().mockResolvedValue({ ok: true, message: "API key is valid." }),
}));

const json = (body: unknown, url = "http://localhost:3000/api/ai-config", method = "POST") =>
  new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

const validInput = {
  name: "Primary",
  serviceType: "Anthropic",
  model: "claude-sonnet-4-5",
  apiKey: "sk-test",
};

describe("/api/ai-config", () => {
  beforeEach(() => {
    encryptionConfigured = true;
    vi.clearAllMocks();
  });

  it("GET lists configs (no secrets) with encryption status", async () => {
    const { GET } = await import("@/app/api/ai-config/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { configs: unknown[]; encryptionConfigured: boolean };
    expect(body.configs).toHaveLength(1);
    expect(body.encryptionConfigured).toBe(true);
    expect(JSON.stringify(body.configs)).not.toContain("encryptedApiKey");
  });

  it("POST creates a config", async () => {
    const { POST } = await import("@/app/api/ai-config/route");
    const res = await POST(json(validInput));
    expect(res.status).toBe(201);
  });

  it("POST rejects missing API key", async () => {
    const { POST } = await import("@/app/api/ai-config/route");
    const { apiKey, ...noKey } = validInput;
    void apiKey;
    const res = await POST(json(noKey));
    expect(res.status).toBe(400);
  });

  it("POST returns 503 when encryption is not configured", async () => {
    encryptionConfigured = false;
    const { POST } = await import("@/app/api/ai-config/route");
    const res = await POST(json(validInput));
    expect(res.status).toBe(503);
  });

  it("POST rejects an invalid provider", async () => {
    const { POST } = await import("@/app/api/ai-config/route");
    const res = await POST(json({ ...validInput, serviceType: "Bogus" }));
    expect(res.status).toBe(400);
  });

  it("PUT updates a config", async () => {
    const { PUT } = await import("@/app/api/ai-config/[id]/route");
    const res = await PUT(json({ ...validInput, apiKey: undefined }, "http://localhost/api/ai-config/1", "PUT"), {
      params: Promise.resolve({ id: "1" }),
    });
    expect(res.status).toBe(200);
  });

  it("PUT returns 404 when the config is missing", async () => {
    const service = await import("@/lib/ai/ai-config-service");
    vi.mocked(service.updateConfig).mockResolvedValueOnce(null);
    const { PUT } = await import("@/app/api/ai-config/[id]/route");
    const res = await PUT(json(validInput, "http://localhost/api/ai-config/9", "PUT"), {
      params: Promise.resolve({ id: "9" }),
    });
    expect(res.status).toBe(404);
  });

  it("DELETE removes a config", async () => {
    const { DELETE } = await import("@/app/api/ai-config/[id]/route");
    const res = await DELETE(new Request("http://localhost/api/ai-config/1", { method: "DELETE" }), {
      params: Promise.resolve({ id: "1" }),
    });
    expect(res.status).toBe(200);
  });

  it("validate checks a fresh key", async () => {
    const { POST } = await import("@/app/api/ai-config/validate/route");
    const res = await POST(json({ serviceType: "Anthropic", apiKey: "sk-test" }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { result: { ok: boolean } };
    expect(body.result.ok).toBe(true);
  });

  it("validate checks a stored config by id", async () => {
    const { POST } = await import("@/app/api/ai-config/validate/route");
    const res = await POST(json({ id: 1 }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { result: { ok: boolean } };
    expect(body.result.ok).toBe(true);
  });
});
