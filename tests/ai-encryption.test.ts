// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  decryptApiKey,
  encryptApiKey,
  generateMasterKey,
  isEncryptionConfigured,
} from "@/lib/ai/encryption";

const ORIGINAL = process.env.ENCRYPTION_MASTER_KEY;

describe("AI key encryption", () => {
  beforeEach(() => {
    process.env.ENCRYPTION_MASTER_KEY = generateMasterKey();
  });

  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.ENCRYPTION_MASTER_KEY;
    else process.env.ENCRYPTION_MASTER_KEY = ORIGINAL;
  });

  it("round-trips an API key", () => {
    const secret = "sk-test-1234567890";
    const { encrypted, salt } = encryptApiKey(secret);
    expect(encrypted).toMatch(/^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/);
    expect(decryptApiKey(encrypted, salt)).toBe(secret);
  });

  it("produces different ciphertext each time (random iv/salt)", () => {
    const a = encryptApiKey("same-secret");
    const b = encryptApiKey("same-secret");
    expect(a.encrypted).not.toBe(b.encrypted);
    expect(a.salt).not.toBe(b.salt);
  });

  it("fails to decrypt tampered ciphertext", () => {
    const { encrypted, salt } = encryptApiKey("secret");
    const [iv, ct, tag] = encrypted.split(":");
    const tamperedCt = ct.replace(/.$/, (c) => (c === "0" ? "1" : "0"));
    expect(() => decryptApiKey(`${iv}:${tamperedCt}:${tag}`, salt)).toThrow();
  });

  it("reports configured state from the env var", () => {
    expect(isEncryptionConfigured()).toBe(true);
    delete process.env.ENCRYPTION_MASTER_KEY;
    expect(isEncryptionConfigured()).toBe(false);
  });

  it("rejects a master key that is not 32 bytes", () => {
    process.env.ENCRYPTION_MASTER_KEY = Buffer.from("too-short").toString("base64");
    expect(() => encryptApiKey("secret")).toThrow(/32-byte/);
  });
});
