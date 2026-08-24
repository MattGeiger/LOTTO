// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Matt Geiger, Temple Consulting, LLC.

import { NextResponse } from "next/server";

import {
  authorizeFeedIntegrationToken,
  getFeedIntegrationStatus,
} from "@/lib/feed-integration-token/index";
import { stateManager } from "@/lib/state-manager";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

type Cursor = { recordedAt: string; summaryId: string };

const noStoreJson = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

const validDate = (value: string | null) => {
  if (value === null) return true;
  if (!DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
};

const parseCursor = (value: string | null): Cursor | null => {
  if (!value) return null;
  try {
    const decoded = JSON.parse(Buffer.from(value, "base64url").toString("utf-8")) as Cursor;
    if (
      typeof decoded.recordedAt !== "string"
      || Number.isNaN(Date.parse(decoded.recordedAt))
      || typeof decoded.summaryId !== "string"
      || decoded.summaryId.length === 0
    ) return null;
    return decoded;
  } catch {
    return null;
  }
};

const encodeCursor = (cursor: Cursor) =>
  Buffer.from(JSON.stringify(cursor), "utf-8").toString("base64url");

export async function GET(request: Request) {
  let configured = false;
  let isAuthorized = false;
  try {
    configured = (await getFeedIntegrationStatus()).configured;
    isAuthorized = configured
      ? await authorizeFeedIntegrationToken(request.headers.get("authorization"))
      : false;
  } catch (error) {
    console.error("[FEED integration] Unable to verify integration credential:", error);
    return noStoreJson(
      { error: { code: "FEED_INTEGRATION_AUTH_UNAVAILABLE", message: "LOTTO could not verify the FEED connection. Try again." } },
      503,
    );
  }
  if (!configured) {
    return noStoreJson(
      { error: { code: "FEED_INTEGRATION_NOT_CONFIGURED", message: "The FEED integration is not configured on this LOTTO deployment." } },
      503,
    );
  }
  if (!isAuthorized) {
    return noStoreJson(
      { error: { code: "INVALID_FEED_INTEGRATION_TOKEN", message: "The saved FEED synchronization token is no longer valid." } },
      401,
    );
  }

  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const rawLimit = url.searchParams.get("limit");
  const cursorValue = url.searchParams.get("cursor");
  const cursor = parseCursor(cursorValue);
  const limit = rawLimit === null ? DEFAULT_LIMIT : Number(rawLimit);
  if (
    !validDate(from)
    || !validDate(to)
    || (from !== null && to !== null && from > to)
    || !Number.isInteger(limit)
    || limit < 1
    || limit > MAX_LIMIT
    || (cursorValue !== null && cursor === null)
  ) {
    return noStoreJson(
      { error: "Use valid from/to dates, an issued cursor, and a limit from 1 to 500." },
      400,
    );
  }

  try {
    const all = await stateManager.listQueueSummaries();
    const currentRevisionBySession = new Map<string, number>();
    for (const summary of all) {
      currentRevisionBySession.set(
        summary.sessionId,
        Math.max(currentRevisionBySession.get(summary.sessionId) ?? 0, summary.revision),
      );
    }
    const afterCursor = (recordedAt: string, summaryId: string) =>
      cursor === null
      || recordedAt > cursor.recordedAt
      || (recordedAt === cursor.recordedAt && summaryId > cursor.summaryId);
    const eligible = all.filter((summary) =>
      afterCursor(summary.recordedAt, summary.summaryId)
      && (from === null || summary.facts.serviceDate >= from)
      && (to === null || summary.facts.serviceDate <= to));
    const page = eligible.slice(0, limit);
    const summaries = page.map((summary) => ({
      summaryId: summary.summaryId,
      sessionId: summary.sessionId,
      revision: summary.revision,
      supersedesSummaryId: summary.supersedesSummaryId,
      contentHash: summary.contentHash,
      isCurrent: currentRevisionBySession.get(summary.sessionId) === summary.revision,
      ...summary.facts,
      closedAt: summary.closedAt,
      recordedAt: summary.recordedAt,
    }));
    const last = page.at(-1);
    return noStoreJson({
      contractVersion: 1,
      summaries,
      nextCursor: last
        ? encodeCursor({ recordedAt: last.recordedAt, summaryId: last.summaryId })
        : null,
      hasMore: eligible.length > page.length,
    });
  } catch (error) {
    console.error("[FEED integration] Unable to list queue summaries:", error);
    return noStoreJson(
      { error: "LOTTO could not load queue summaries. Try the synchronization again." },
      500,
    );
  }
}
