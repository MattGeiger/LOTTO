// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Matt Geiger, Temple Consulting, LLC.

import fs from "node:fs/promises";
import path from "node:path";

import type { FeedIntegrationCredential } from "./types";

const filePath = () =>
  process.env.FEED_INTEGRATION_TOKEN_FILE
  ?? path.join(process.cwd(), "data", "feed-integration-token.json");

export const getCredential = async (): Promise<FeedIntegrationCredential | null> => {
  try {
    const parsed = JSON.parse(await fs.readFile(filePath(), "utf8")) as FeedIntegrationCredential;
    return typeof parsed.tokenHash === "string" && typeof parsed.createdAt === "string"
      ? parsed
      : null;
  } catch {
    return null;
  }
};

const writeCredential = async (credential: FeedIntegrationCredential): Promise<void> => {
  await fs.mkdir(path.dirname(filePath()), { recursive: true });
  await fs.writeFile(filePath(), JSON.stringify(credential, null, 2), "utf8");
};

export const replaceCredential = async (tokenHash: string): Promise<FeedIntegrationCredential> => {
  const credential = {
    tokenHash,
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
  };
  await writeCredential(credential);
  return credential;
};

export const markCredentialUsed = async (): Promise<void> => {
  const credential = await getCredential();
  if (!credential) return;
  await writeCredential({ ...credential, lastUsedAt: new Date().toISOString() });
};
