// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.

import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("staff email policy integration", () => {
  it("uses the shared policy for OTP issuance, OTP verification, and Magic Link sign-in", () => {
    const authSource = readFileSync(path.resolve(process.cwd(), "src/lib/auth.ts"), "utf8");
    const otpSource = readFileSync(
      path.resolve(process.cwd(), "src/app/api/auth/otp/request/route.ts"),
      "utf8",
    );

    expect(authSource.match(/isAdminEmailAllowed\(/g)).toHaveLength(2);
    expect(otpSource.match(/isAdminEmailAllowed\(/g)).toHaveLength(1);
    expect(authSource).not.toContain("ADMIN_EMAIL_DOMAIN");
    expect(otpSource).not.toContain("ADMIN_EMAIL_DOMAIN");
  });
});
