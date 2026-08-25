// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.

import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const source = (relativePath: string) =>
  readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("authentication token isolation", () => {
  it("gives verification tokens an additive type discriminator", () => {
    const schema = source("schema.sql");

    expect(schema).toContain("type TEXT NOT NULL DEFAULT 'magic_link'");
    expect(schema).toContain("ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'magic_link'");
    expect(schema).toContain("verification_token_identifier_type_idx");
  });

  it("limits OTP issuance and consumption to OTP rows", () => {
    const requestRoute = source("src/app/api/auth/otp/request/route.ts");
    const auth = source("src/lib/auth.ts");

    expect(requestRoute).toContain("identifier = $1 and type = 'otp'");
    expect(requestRoute).toContain("expires, type) values ($1, $2, $3, 'otp')");
    expect(auth).toContain("token = $2 and type = 'otp' and expires > now()");
  });
});
