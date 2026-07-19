// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.

import { describe, expect, it } from "vitest";

import { getAdminEmailPolicy, isAdminEmailAllowed } from "@/lib/admin-email-policy";

describe("admin email policy", () => {
  it("allows exact addresses case-insensitively", () => {
    const env = {
      NODE_ENV: "production",
      ADMIN_EMAIL_ALLOWLIST: "Director@gmail.com, operations@example.org",
    };

    expect(isAdminEmailAllowed("director@GMAIL.com", env)).toBe(true);
    expect(isAdminEmailAllowed("operations@example.org", env)).toBe(true);
    expect(isAdminEmailAllowed("someone-else@gmail.com", env)).toBe(false);
  });

  it("combines exact addresses with an allowed domain", () => {
    const env = {
      NODE_ENV: "production",
      ADMIN_EMAIL_ALLOWLIST: "stjohnsfoodshare@gmail.com",
      ADMIN_EMAIL_DOMAIN: "templepdx.com",
    };

    expect(getAdminEmailPolicy(env).mode).toBe("restricted");
    expect(isAdminEmailAllowed("stjohnsfoodshare@gmail.com", env)).toBe(true);
    expect(isAdminEmailAllowed("matt@templepdx.com", env)).toBe(true);
    expect(isAdminEmailAllowed("another-staff-member@templepdx.com", env)).toBe(true);
    expect(isAdminEmailAllowed("unapproved@gmail.com", env)).toBe(false);
  });

  it("supports an exact domain policy without an allowlist", () => {
    const env = {
      NODE_ENV: "production",
      ADMIN_EMAIL_DOMAIN: "stjohnsfoodshare.org",
    };

    expect(isAdminEmailAllowed("staff@stjohnsfoodshare.org", env)).toBe(true);
    expect(isAdminEmailAllowed("staff@notstjohnsfoodshare.org", env)).toBe(false);
    expect(isAdminEmailAllowed("staff@stjohnsfoodshare.org.example.com", env)).toBe(false);
  });

  it("fails closed in production when no policy is configured", () => {
    expect(isAdminEmailAllowed("staff@example.org", { NODE_ENV: "production" })).toBe(false);
  });

  it("keeps policy-free local development available", () => {
    expect(isAdminEmailAllowed("staff@example.org", { NODE_ENV: "development" })).toBe(true);
  });

  it("rejects malformed allowlist and domain configuration", () => {
    expect(() =>
      getAdminEmailPolicy({ NODE_ENV: "production", ADMIN_EMAIL_ALLOWLIST: "gmail.com" }),
    ).toThrow("ADMIN_EMAIL_ALLOWLIST");
    expect(() =>
      getAdminEmailPolicy({ NODE_ENV: "production", ADMIN_EMAIL_DOMAIN: "person@gmail.com" }),
    ).toThrow("ADMIN_EMAIL_DOMAIN");
  });
});
