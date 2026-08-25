// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

import {
  Heading,
  Section,
  Text,
} from "@react-email/components";

import {
  AuthEmailLayout,
  authEmailHeadingStyle,
  authEmailTextStyle,
} from "@/emails/auth-email-layout";
import { OTP_EXPIRY_MINUTES } from "@/lib/auth-constants";
import type { AuthEmailBrand } from "@/lib/auth-email-brand";

type OtpCodeProps = {
  code: string;
  brand: AuthEmailBrand;
};

export const OtpCode = ({ code, brand }: OtpCodeProps) => (
  <AuthEmailLayout
    brand={brand}
    preview={`${code} is your ${brand.organizationName} verification code — expires in ${OTP_EXPIRY_MINUTES} minutes.`}
    securityMessage="If you did not ask to sign in, you can ignore this message. The code expires on its own and is useless without access to your sign-in attempt."
  >
    <Heading style={authEmailHeadingStyle(brand)}>Your verification code</Heading>
    <Text style={authEmailTextStyle}>Enter this code on the sign-in page for {brand.appName}:</Text>
    <Section
      style={{
        margin: "8px 0 24px",
        padding: "20px 28px",
        borderRadius: "8px",
        backgroundColor: brand.tint,
        textAlign: "center",
      }}
    >
      <Text
        style={{
          margin: 0,
          color: brand.primary,
          fontFamily: "'SF Mono', Menlo, Consolas, 'Courier New', monospace",
          fontSize: "34px",
          fontWeight: 700,
          letterSpacing: "10px",
          lineHeight: "40px",
        }}
      >
        {code}
      </Text>
    </Section>
    <Text style={{ ...authEmailTextStyle, textAlign: "center" }}>
      This code expires in {OTP_EXPIRY_MINUTES} minutes.
    </Text>
  </AuthEmailLayout>
);

export default OtpCode;
