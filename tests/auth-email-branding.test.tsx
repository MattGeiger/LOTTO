// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.

import { render } from "@react-email/components";
import React from "react";
import { describe, expect, it } from "vitest";

import { MagicLinkEmail } from "@/emails/magic-link";
import { OtpCode } from "@/emails/otp-code";
import { getBrandProfile } from "@/config/brand";
import { createAuthEmailBrand } from "@/lib/auth-email-brand";
import { resolvedBrandFromProfile } from "@/lib/brand-config/types";

const renderedEmail = async (kind: "magic" | "otp") => {
  const brand = createAuthEmailBrand(resolvedBrandFromProfile(getBrandProfile()));
  const element =
    kind === "magic"
      ? React.createElement(MagicLinkEmail, {
          brand,
          magicLink: "https://lotto.example/api/auth/callback/resend?token=secret",
        })
      : React.createElement(OtpCode, { brand, code: "482731" });

  return {
    brand,
    html: await render(element),
    text: await render(element, { plainText: true }),
  };
};

describe("branded authentication email templates", () => {
  it("renders William Temple House identity as live text as well as a logo", async () => {
    const { brand, html, text } = await renderedEmail("magic");

    expect(html).toContain("William Temple House");
    expect(html).toContain(brand.appName);
    expect(html).toContain(brand.logoUrl);
    expect(html).toContain(brand.primary);
    expect(text).toContain("William Temple House");
    expect(text).toContain(brand.appName);
    expect(text).not.toContain("<html");
  });

  it("keeps Magic Link and verification-code content distinct", async () => {
    const magic = await renderedEmail("magic");
    const otp = await renderedEmail("otp");

    expect(magic.text).toContain("Continue to sign in");
    expect(magic.text).toContain("confirm on the page that opens");
    expect(otp.text).toContain("482731");
    expect(otp.text.toLowerCase()).toContain("verification code");
    expect(otp.text).not.toContain("Continue to sign in");
  });

  it("does not add a logo plate when the active treatment is transparent", async () => {
    const magic = await renderedEmail("magic");

    expect(magic.brand.logoPresentation).toBe("transparent");
    expect(magic.html).not.toContain(`background-color:${magic.brand.logoSurface}`);
  });
});
