// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Matt Geiger, Temple Consulting, LLC.

import { NextResponse } from "next/server";

import { isAdminEmailAllowed } from "@/lib/admin-email-policy";
import { auth } from "@/lib/auth";
import {
  generateFeedIntegrationToken,
  getFeedIntegrationStatus,
} from "@/lib/feed-integration-token/index";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStoreJson = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

const hasAdministratorAuthority = async (): Promise<boolean> => {
  const isLocalDevelopment = process.env.NODE_ENV === "development" && !process.env.VERCEL;
  if (process.env.AUTH_BYPASS === "true" || isLocalDevelopment) return true;
  const session = await auth();
  return Boolean(
    session?.user?.email
    && isAdminEmailAllowed(session.user.email.toLowerCase().trim())
  );
};

const unauthorized = () => noStoreJson(
  { error: { code: "ADMIN_REQUIRED", message: "Sign in with an authorized administrator email to manage the FEED connection." } },
  403,
);

export async function GET() {
  if (!(await hasAdministratorAuthority())) return unauthorized();
  try {
    return noStoreJson({ status: await getFeedIntegrationStatus() });
  } catch (error) {
    console.error("[FEED pairing] Unable to load token status:", error);
    return noStoreJson(
      { error: { code: "FEED_PAIRING_STATUS_FAILED", message: "LOTTO could not load the FEED pairing status. Try again." } },
      500,
    );
  }
}

export async function POST() {
  if (!(await hasAdministratorAuthority())) return unauthorized();
  try {
    const generated = await generateFeedIntegrationToken();
    return noStoreJson(generated, 201);
  } catch (error) {
    console.error("[FEED pairing] Unable to generate token:", error);
    return noStoreJson(
      { error: { code: "FEED_PAIRING_GENERATION_FAILED", message: "LOTTO could not generate a FEED synchronization token. Confirm the database schema is current, then try again." } },
      500,
    );
  }
}
