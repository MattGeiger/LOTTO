// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

import { createHash, randomInt } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { OTP_MAX_AGE_MS } from "@/lib/auth-constants";
import { sendOtpEmail } from "@/lib/auth-email-service";
import { getPool } from "@/lib/db";
import { isAdminEmailAllowed } from "@/lib/admin-email-policy";

export const runtime = "nodejs";

const requestSchema = z.object({
  email: z.string().email(),
});

const hashToken = (value: string) => createHash("sha256").update(value).digest("hex");
const generateCode = () => String(randomInt(100000, 1000000));

export async function POST(request: Request) {
  const pool = getPool();
  try {
    const ensureOtpFailuresTable = async () => {
      await pool.query(`
        create table if not exists otp_failures (
          email text primary key,
          attempts int not null default 0,
          locked_until timestamptz,
          last_request timestamptz
        );
      `);
    };

    const body = await request.json().catch(() => ({}));
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid email." }, { status: 400 });
    }

    const email = parsed.data.email.toLowerCase();
    if (!isAdminEmailAllowed(email)) {
      return NextResponse.json({ error: "Email address is not authorized." }, { status: 403 });
    }

    const isProduction = process.env.NODE_ENV === "production";
    const expiresAt = new Date(Date.now() + OTP_MAX_AGE_MS);
    const code = generateCode();
    const token = hashToken(code);

    await ensureOtpFailuresTable();
    const now = new Date();
    const failureRow = await pool.query<{ locked_until: string | null; last_request: string | null }>(
      "select locked_until, last_request from otp_failures where email = $1 limit 1",
      [email],
    );
    const lockedUntil = failureRow.rows[0]?.locked_until
      ? new Date(failureRow.rows[0].locked_until)
      : null;
    if (lockedUntil && lockedUntil > now) {
      return NextResponse.json(
        { error: "Too many attempts. Try again after cooldown." },
        { status: 429 },
      );
    }
    const lastRequest = failureRow.rows[0]?.last_request
      ? new Date(failureRow.rows[0].last_request)
      : null;
    if (lastRequest && now.getTime() - lastRequest.getTime() < 60_000) {
      return NextResponse.json(
        { error: "Please wait before requesting another code." },
        { status: 429 },
      );
    }

    await pool.query("delete from verification_token where identifier = $1 and type = 'otp'", [email]);
    await pool.query(
      "insert into verification_token (identifier, token, expires, type) values ($1, $2, $3, 'otp')",
      [email, token, expiresAt.toISOString()],
    );
    await pool.query(
      `
        insert into otp_failures (email, attempts, locked_until, last_request)
        values ($1, 0, null, $2)
        on conflict (email) do update
        set attempts = 0, locked_until = null, last_request = $2
      `,
      [email, now.toISOString()],
    );

    const maskedEmail = `${email.slice(0, 2)}***@${email.split("@")[1]}`;

    try {
      await sendOtpEmail({ email, code });
    } catch (deliveryError) {
      if (isProduction) {
        console.error("[OTP] Email delivery failed:", deliveryError);
        return NextResponse.json(
          { error: "Unable to send code. Please try again." },
          { status: 500 },
        );
      }
      console.warn("[OTP] Delivery unavailable; using development fallback.");
      console.info("[OTP] Development code issued", { email: maskedEmail, code });
      return NextResponse.json({ success: true, devCode: code, delivery: "development-fallback" });
    }

    console.log("[OTP] Code issued", { email: maskedEmail });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[OTP] Failed to issue code:", error);
    const isProduction = process.env.NODE_ENV === "production";
    const errorMessage = isProduction
      ? "Unable to issue code. Please try again."
      : "Unable to issue code. Start MailDev (`docker compose up --build`) or configure a valid RESEND_API_KEY and EMAIL_FROM.";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 },
    );
  }
}
