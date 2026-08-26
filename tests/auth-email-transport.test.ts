// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE.

/*
 * Delivery-transport contract for authentication email.
 *
 * This module had no coverage. That mattered: `src/lib/auth.ts` refuses to
 * start in production without a valid RESEND_API_KEY, but
 * `/api/auth/otp/request` imports `auth-email-service` directly and never
 * loads that config, so the OTP path could reach the SMTP transport in
 * production if the key were ever absent or malformed. nodemailer carries an
 * advisory that cannot be fixed inside the Auth.js peer range, so "SMTP is
 * development-only" needs to be a property of the code rather than of the
 * deployment environment.
 *
 * Both exported senders are exercised, because they are reached by different
 * routes with different guards in front of them.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sendMail = vi.fn().mockResolvedValue({ accepted: ["x@example.org"] });
const createTransport = vi.fn(() => ({ sendMail }));
const resendSend = vi.fn().mockResolvedValue({ error: null });

vi.mock("nodemailer", () => ({ default: { createTransport } }));
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: resendSend };
  },
}));
vi.mock("@react-email/components", () => ({ render: async () => "rendered" }));
vi.mock("@/lib/brand-config/resolve", () => ({
  getResolvedRuntimeBrand: async () => ({
    brand: { brandId: "custom", organizationName: "Test Pantry" },
    config: {},
  }),
}));
vi.mock("@/lib/auth-email-brand", () => ({
  createAuthEmailBrand: () => ({ organizationName: "Test Pantry", senderName: "Test Pantry" }),
}));
vi.mock("@/emails/magic-link", () => ({ MagicLinkEmail: () => null }));
vi.mock("@/emails/otp-code", () => ({ OtpCode: () => null }));

const ORIGINAL = { ...process.env };

const load = async () => {
  vi.resetModules();
  return import("@/lib/auth-email-service");
};

beforeEach(() => {
  sendMail.mockClear();
  createTransport.mockClear();
  resendSend.mockClear();
  process.env.EMAIL_FROM = "login@example.org";
});

afterEach(() => {
  vi.unstubAllEnvs();
  process.env = { ...ORIGINAL };
});

describe("authentication email transport", () => {
  describe("production refuses SMTP", () => {
    beforeEach(() => {
      vi.stubEnv("NODE_ENV", "production");
      delete process.env.RESEND_API_KEY;
    });

    it("refuses the OTP path rather than falling through to nodemailer", async () => {
      const { sendOtpEmail } = await load();
      await expect(sendOtpEmail({ email: "staff@example.org", code: "123456" })).rejects.toThrow(
        /Refusing SMTP delivery in production/,
      );
      expect(createTransport).not.toHaveBeenCalled();
      expect(sendMail).not.toHaveBeenCalled();
    });

    it("refuses the magic-link path as well", async () => {
      const { sendMagicLinkEmail } = await load();
      await expect(
        sendMagicLinkEmail({
          email: "staff@example.org",
          magicLink: "https://example.org/x",
          expires: new Date(),
        }),
      ).rejects.toThrow(/Refusing SMTP delivery in production/);
      expect(createTransport).not.toHaveBeenCalled();
    });

    it("refuses when the key is present but malformed", async () => {
      // The `re_` prefix check is what distinguishes valid from malformed; a
      // malformed key previously fell straight through to SMTP.
      process.env.RESEND_API_KEY = "not-a-resend-key";
      const { sendOtpEmail } = await load();
      await expect(sendOtpEmail({ email: "staff@example.org", code: "123456" })).rejects.toThrow(
        /Refusing SMTP delivery in production/,
      );
      expect(createTransport).not.toHaveBeenCalled();
    });

    it("still delivers through Resend when the key is valid", async () => {
      process.env.RESEND_API_KEY = "re_valid_key";
      const { sendOtpEmail } = await load();
      await sendOtpEmail({ email: "staff@example.org", code: "123456" });
      expect(resendSend).toHaveBeenCalledTimes(1);
      expect(createTransport).not.toHaveBeenCalled();
    });
  });

  describe("development keeps the local SMTP/MailDev path", () => {
    beforeEach(() => {
      vi.stubEnv("NODE_ENV", "development");
      delete process.env.RESEND_API_KEY;
    });

    it("uses nodemailer for the OTP path", async () => {
      const { sendOtpEmail } = await load();
      await sendOtpEmail({ email: "staff@example.org", code: "123456" });
      expect(createTransport).toHaveBeenCalledTimes(1);
      expect(sendMail).toHaveBeenCalledTimes(1);
    });

    it("uses nodemailer for the magic-link path", async () => {
      const { sendMagicLinkEmail } = await load();
      await sendMagicLinkEmail({
        email: "staff@example.org",
        magicLink: "https://example.org/x",
        expires: new Date(),
      });
      expect(sendMail).toHaveBeenCalledTimes(1);
    });
  });
});
