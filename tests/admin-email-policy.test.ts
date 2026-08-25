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
  // Regression guard for GHSA-7rqj-j65f-68wh (Auth.js homoglyph "@" bypass).
  // The upstream bug was ordering: validate the raw address, normalize after.
  // These assert LOTTO normalizes first and refuses non-ASCII outright.
  describe("Unicode confusable resistance", () => {
    const env = {
      NODE_ENV: "production",
      ADMIN_EMAIL_ALLOWLIST: "director@templepdx.com",
      ADMIN_EMAIL_DOMAIN: "templepdx.com",
    };

    it("rejects a fullwidth-@ homoglyph that would smuggle a second separator", () => {
      // U+FF20 survives the raw [^\s@] structural check because it is not an
      // ASCII "@", but collapses to one under NFKC — changing the real domain.
      expect(isAdminEmailAllowed("director@templepdx.com\uFF20evil.example", env)).toBe(false);
      expect(isAdminEmailAllowed("director\uFF20templepdx.com", env)).toBe(false);
    });

    it("rejects homoglyph domains that visually match the allowed domain", () => {
      // Cyrillic "е" (U+0435) renders identically to Latin "e".
      expect(isAdminEmailAllowed("director@t\u0435mplepdx.com", env)).toBe(false);
      expect(isAdminEmailAllowed("staff@templepdx.co\u043C", env)).toBe(false);
    });

    it("rejects zero-width and non-printable padding around a valid address", () => {
      expect(isAdminEmailAllowed("director@templepdx.com\u200B", env)).toBe(false);
      expect(isAdminEmailAllowed("dir\u200Cector@templepdx.com", env)).toBe(false);
    });

    it("still accepts ordinary ASCII addresses unchanged", () => {
      // Guards against the hardening over-rejecting real staff sign-ins.
      expect(isAdminEmailAllowed("director@templepdx.com", env)).toBe(true);
      expect(isAdminEmailAllowed("  Director@TemplePDX.com  ", env)).toBe(true);
      expect(isAdminEmailAllowed("first.last+tag@templepdx.com", env)).toBe(true);
      expect(isAdminEmailAllowed("et2.geiger@gmail.com", { NODE_ENV: "development" })).toBe(true);
    });
  });
});
