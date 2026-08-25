// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.

import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { ReactNode } from "react";

import type { AuthEmailBrand } from "@/lib/auth-email-brand";

type AuthEmailLayoutProps = {
  brand: AuthEmailBrand;
  preview: string;
  securityMessage: string;
  children: ReactNode;
};
const fontFamily =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

/**
 * The shared shell for every LOTTO authentication email.
 *
 * Identity is repeated as live text because Outlook and privacy-filtered mail
 * clients commonly block remote images. The logo is recognition, not proof;
 * authenticated sending-domain configuration remains the origin control.
 */
export function AuthEmailLayout({
  brand,
  preview,
  securityMessage,
  children,
}: AuthEmailLayoutProps) {
  const logo = (
    <Img
      src={brand.logoUrl}
      width="260"
      alt={brand.organizationName}
      style={{
        display: "block",
        width: "260px",
        maxWidth: "100%",
        height: "auto",
        margin: "0 auto",
      }}
    />
  );

  return (
    <Html lang="en">
      <Head>
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
      </Head>
      <Preview>{preview}</Preview>
      <Body style={{ margin: 0, padding: 0, backgroundColor: "#F4F6F9", fontFamily }}>
        <Container
          style={{
            width: "100%",
            maxWidth: "600px",
            margin: "32px auto",
            backgroundColor: "#FFFFFF",
            border: "1px solid #E3E8EE",
            borderRadius: "10px",
            overflow: "hidden",
          }}
        >
          <Section style={{ padding: "30px 40px 18px", textAlign: "center", backgroundColor: "#FFFFFF" }}>
            {brand.logoPresentation === "dark-surface" ? (
              <table
                align="center"
                width="320"
                cellPadding="0"
                cellSpacing="0"
                role="presentation"
                style={{ width: "320px", maxWidth: "100%", margin: "0 auto" }}
              >
                <tbody>
                  <tr>
                    <td
                      align="center"
                      style={{
                        padding: "16px 20px",
                        backgroundColor: brand.logoSurface,
                        borderRadius: "14px",
                      }}
                    >
                      {logo}
                    </td>
                  </tr>
                </tbody>
              </table>
            ) : (
              logo
            )}
            <Text
              style={{
                margin: "16px 0 0",
                color: brand.primary,
                fontSize: "12px",
                fontWeight: 700,
                letterSpacing: "1.4px",
                lineHeight: "18px",
                textTransform: "uppercase",
              }}
            >
              {brand.appName}
            </Text>
            <Text style={{ margin: "3px 0 0", color: "#6B7684", fontSize: "13px", lineHeight: "19px" }}>
              {brand.tagline}
            </Text>
          </Section>

          <Section style={{ padding: "0 40px" }}>
            <table width="100%" cellPadding="0" cellSpacing="0" role="presentation">
              <tbody>
                <tr>
                  <td style={{ height: "3px", backgroundColor: brand.primary, fontSize: 0 }}>&nbsp;</td>
                  <td style={{ width: "72px", height: "3px", backgroundColor: brand.accent, fontSize: 0 }}>&nbsp;</td>
                </tr>
              </tbody>
            </table>
          </Section>

          <Section style={{ padding: "28px 40px 8px", color: "#3F4A56" }}>{children}</Section>

          <Section style={{ padding: "20px 40px 30px" }}>
            <Hr style={{ margin: "0 0 18px", borderColor: "#E3E8EE" }} />
            <Text style={{ margin: "0 0 10px", color: "#6B7684", fontSize: "13px", lineHeight: "20px" }}>
              {securityMessage}
            </Text>
            <Text style={{ margin: "0 0 10px", color: "#6B7684", fontSize: "13px", lineHeight: "20px" }}>
              {brand.appName} will never ask you for a password, and will never ask you to reply to this message with a code.
            </Text>
            <Text style={{ margin: 0, color: "#6B7684", fontSize: "13px", lineHeight: "20px" }}>
              Sent by {brand.organizationName} · {brand.publicAppUrl}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export const authEmailHeadingStyle = (brand: AuthEmailBrand) => ({
  margin: "0 0 14px",
  color: brand.ink,
  fontFamily,
  fontSize: "22px",
  fontWeight: 700,
  lineHeight: "30px",
});

export const authEmailTextStyle = {
  margin: "0 0 16px",
  color: "#3F4A56",
  fontFamily,
  fontSize: "16px",
  lineHeight: "25px",
};
