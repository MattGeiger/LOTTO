// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.

import { Button, Heading, Section, Text } from "@react-email/components";

import {
  AuthEmailLayout,
  authEmailHeadingStyle,
  authEmailTextStyle,
} from "@/emails/auth-email-layout";
import { MAGIC_LINK_EXPIRY_MINUTES } from "@/lib/auth-constants";
import type { AuthEmailBrand } from "@/lib/auth-email-brand";

export function MagicLinkEmail({ brand, magicLink }: { brand: AuthEmailBrand; magicLink: string }) {
  return (
    <AuthEmailLayout
      brand={brand}
      preview={`Your sign-in link for ${brand.organizationName} — expires in ${MAGIC_LINK_EXPIRY_MINUTES} minutes.`}
      securityMessage="If you did not ask to sign in, you can ignore this message. The link expires on its own and nothing happens until you confirm it."
    >
      <Heading style={authEmailHeadingStyle(brand)}>Sign in to {brand.organizationName}</Heading>
      <Text style={authEmailTextStyle}>
        You asked to sign in to {brand.appName}. Use the button below, then confirm on the page that opens.
      </Text>
      <Section style={{ padding: "10px 0 24px", textAlign: "center" }}>
        <Button
          href={magicLink}
          style={{
            display: "inline-block",
            padding: "14px 30px",
            borderRadius: "6px",
            backgroundColor: brand.primary,
            color: brand.primaryForeground,
            fontSize: "16px",
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          Continue to sign in
        </Button>
      </Section>
      <Text style={{ ...authEmailTextStyle, textAlign: "center" }}>
        This link expires in {MAGIC_LINK_EXPIRY_MINUTES} minutes and can only be used once.
      </Text>
    </AuthEmailLayout>
  );
}
