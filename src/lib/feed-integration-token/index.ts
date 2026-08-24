// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Matt Geiger, Temple Consulting, LLC.

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import * as dbStore from "./store-db";
import * as fileStore from "./store-file";
import type {
  FeedIntegrationCredential,
  FeedIntegrationCredentialStatus,
} from "./types";

const storageMode = process.env.STATE_STORAGE?.toLowerCase();
const useDatabase =
  storageMode === "db" || (!storageMode && Boolean(process.env.DATABASE_URL));
const store = useDatabase ? dbStore : fileStore;

const hashToken = (token: string): string =>
  createHash("sha256").update(token).digest("hex");

const safeHashEqual = (left: string, right: string): boolean => {
  const leftBytes = Buffer.from(left, "hex");
  const rightBytes = Buffer.from(right, "hex");
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
};

const environmentCredential = (): FeedIntegrationCredential | null => {
  const token = process.env.LOTTO_FEED_INTEGRATION_TOKEN?.trim();
  if (!token) return null;
  return { tokenHash: hashToken(token), createdAt: "environment", lastUsedAt: null };
};

const activeCredential = async (): Promise<{
  credential: FeedIntegrationCredential;
  source: "database" | "environment";
} | null> => {
  const stored = await store.getCredential();
  if (stored) return { credential: stored, source: "database" };
  const legacy = environmentCredential();
  return legacy ? { credential: legacy, source: "environment" } : null;
};

export const getFeedIntegrationStatus = async (): Promise<FeedIntegrationCredentialStatus> => {
  const active = await activeCredential();
  if (!active) {
    return { configured: false, source: null, createdAt: null, lastUsedAt: null };
  }
  return {
    configured: true,
    source: active.source,
    createdAt: active.source === "database" ? active.credential.createdAt : null,
    lastUsedAt: active.credential.lastUsedAt,
  };
};

export const generateFeedIntegrationToken = async (): Promise<{
  token: string;
  status: FeedIntegrationCredentialStatus;
}> => {
  const token = randomBytes(48).toString("base64url");
  const credential = await store.replaceCredential(hashToken(token));
  return {
    token,
    status: {
      configured: true,
      source: "database",
      createdAt: credential.createdAt,
      lastUsedAt: null,
    },
  };
};

export const authorizeFeedIntegrationToken = async (header: string | null): Promise<boolean> => {
  if (!header?.startsWith("Bearer ")) return false;
  const supplied = header.slice("Bearer ".length).trim();
  if (!supplied) return false;
  const active = await activeCredential();
  if (!active || !safeHashEqual(hashToken(supplied), active.credential.tokenHash)) return false;
  if (active.source === "database") {
    // Usage metadata must never turn a valid read-only synchronization into an
    // outage. Authentication succeeded; a failed timestamp write is diagnostic.
    await store.markCredentialUsed().catch(error => {
      console.error("[FEED integration] Unable to record token use:", error);
    });
  }
  return true;
};
