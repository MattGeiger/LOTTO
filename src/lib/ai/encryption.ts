// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

// API-key encryption (ported from FEED's services/encryption.ts). AES-256-GCM
// with a per-record salt and a scrypt-derived key. The master key comes from the
// ENCRYPTION_MASTER_KEY environment variable (a base64-encoded 32-byte value) —
// LOTTO does not use FEED's in-DB key manager or setup wizard.

import crypto from "node:crypto";

export type EncryptedField = {
  /** "iv:ciphertext:tag", all hex-encoded. */
  encrypted: string;
  /** Hex-encoded random salt used for scrypt key derivation. */
  salt: string;
};

export class EncryptionNotConfiguredError extends Error {
  constructor() {
    super(
      "ENCRYPTION_MASTER_KEY is not configured. Set it to a base64-encoded 32-byte value " +
        "(generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\").",
    );
    this.name = "EncryptionNotConfiguredError";
  }
}

const getMasterKey = (): string => {
  const value = process.env.ENCRYPTION_MASTER_KEY?.trim();
  if (!value) {
    throw new EncryptionNotConfiguredError();
  }
  const decoded = Buffer.from(value, "base64");
  if (decoded.length !== 32) {
    throw new Error("ENCRYPTION_MASTER_KEY must be a base64-encoded 32-byte value.");
  }
  return value;
};

/** Whether a usable master key is configured (for UI gating, no throw). */
export const isEncryptionConfigured = (): boolean => {
  try {
    getMasterKey();
    return true;
  } catch {
    return false;
  }
};

export const encryptApiKey = (apiKey: string): EncryptedField => {
  if (!apiKey || typeof apiKey !== "string") {
    throw new Error("API key must be a non-empty string.");
  }
  const masterKey = getMasterKey();
  const salt = crypto.randomBytes(16).toString("hex");
  const key = crypto.scryptSync(masterKey, salt, 32);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  let encrypted = cipher.update(apiKey, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag().toString("hex");
  return { encrypted: `${iv.toString("hex")}:${encrypted}:${tag}`, salt };
};

export const decryptApiKey = (encrypted: string, salt: string): string => {
  if (!encrypted || !salt) {
    throw new Error("Encrypted data and salt are required.");
  }
  const masterKey = getMasterKey();
  const key = crypto.scryptSync(masterKey, salt, 32);
  const parts = encrypted.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted data format.");
  }
  const [ivHex, encryptedHex, tagHex] = parts;
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  let decrypted = decipher.update(encryptedHex, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
};

/** Generate a master key for ENCRYPTION_MASTER_KEY (ops/setup helper). */
export const generateMasterKey = (): string => crypto.randomBytes(32).toString("base64");
