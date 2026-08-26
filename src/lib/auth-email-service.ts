// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.

import "server-only";

import { render } from "@react-email/components";
import nodemailer from "nodemailer";
import React from "react";
import { Resend } from "resend";

import { MagicLinkEmail } from "@/emails/magic-link";
import { OtpCode } from "@/emails/otp-code";
import { createAuthEmailBrand } from "@/lib/auth-email-brand";
import { getResolvedRuntimeBrand } from "@/lib/brand-config/resolve";

type AuthEmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
  from: string;
};

const hasValidResendApiKey = (value: string | undefined): value is string =>
  typeof value === "string" && value.trim().startsWith("re_");

const smtpTransport = () =>
  nodemailer.createTransport({
    host: process.env.EMAIL_SERVER_HOST ?? "localhost",
    port: Number(process.env.EMAIL_SERVER_PORT ?? "1025"),
    secure: false,
    auth: process.env.EMAIL_SERVER_USER
      ? {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD ?? "",
        }
      : undefined,
  });

const deliver = async (message: AuthEmailMessage): Promise<void> => {
  const resendApiKey = process.env.RESEND_API_KEY;
  const isProduction = process.env.NODE_ENV === "production";

  if (hasValidResendApiKey(resendApiKey)) {
    try {
      const resend = new Resend(resendApiKey);
      const { error } = await resend.emails.send({
        from: message.from,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
      });
      if (!error) return;
      console.error("[Auth email] Resend delivery failed:", error);
      if (isProduction) throw new Error("Resend rejected the authentication email.");
    } catch (error) {
      if (isProduction) throw error;
      console.warn("[Auth email] Resend unavailable; trying SMTP/MailDev.");
    }
  } else if (resendApiKey) {
    console.warn("[Auth email] RESEND_API_KEY is not valid; trying SMTP/MailDev.");
  }

  // Structural guarantee that the SMTP transport is development-only.
  //
  // Every branch above that reaches this point already checks isProduction —
  // except the one where RESEND_API_KEY is absent or malformed, which fell
  // through unguarded. `src/lib/auth.ts` refuses to start in production
  // without a valid key, but `/api/auth/otp/request` imports this module
  // directly and never loads that config, so the guard did not cover the OTP
  // path. Production delivery therefore depended on the environment being
  // right rather than on the code refusing to do otherwise.
  //
  // nodemailer carries an unfixed advisory that needs 9.0.1+, which falls
  // outside the Auth.js peer range (see CHANGELOG v1.25.0). Keeping SMTP
  // provably unreachable in production is what makes that advisory's
  // dev-only reachability a property of the code rather than of the
  // deployment configuration.
  if (isProduction) {
    throw new Error(
      "Refusing SMTP delivery in production. Set a valid RESEND_API_KEY; " +
        "the SMTP/MailDev transport is for local development only.",
    );
  }

  await smtpTransport().sendMail(message);
};

const renderMessage = async (element: React.ReactElement) => ({
  html: await render(element),
  text: await render(element, { plainText: true }),
});

const resolveEmailContext = async () => {
  const { brand, config } = await getResolvedRuntimeBrand();
  const emailBrand = createAuthEmailBrand(brand, config);
  const fromAddress = process.env.EMAIL_FROM ?? "login@localhost";

  if (!/^[^\s@<>]+@[^\s@<>]+$/.test(fromAddress)) {
    throw new Error("EMAIL_FROM must be a valid email address.");
  }

  return {
    brand: emailBrand,
    from: `${emailBrand.senderName} <${fromAddress}>`,
  };
};

export const sendMagicLinkEmail = async ({
  email,
  magicLink,
}: {
  email: string;
  magicLink: string;
  expires: Date;
}): Promise<void> => {
  const { brand, from } = await resolveEmailContext();
  const rendered = await renderMessage(
    React.createElement(MagicLinkEmail, { brand, magicLink }),
  );

  await deliver({
    to: email,
    from,
    subject: `Sign in to ${brand.organizationName}`,
    ...rendered,
  });
};

export const sendOtpEmail = async ({ email, code }: { email: string; code: string }) => {
  const { brand, from } = await resolveEmailContext();
  const rendered = await renderMessage(React.createElement(OtpCode, { brand, code }));

  await deliver({
    to: email,
    from,
    subject: `Your ${brand.organizationName} verification code`,
    ...rendered,
  });
};
