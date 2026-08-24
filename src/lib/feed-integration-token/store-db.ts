// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Matt Geiger, Temple Consulting, LLC.

import { neon } from "@neondatabase/serverless";

import type { FeedIntegrationCredential } from "./types";

type DbRow = {
  token_hash: string;
  created_at: string;
  last_used_at: string | null;
};

const getSql = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to store the FEED integration token.");
  }
  return neon(process.env.DATABASE_URL);
};

const toCredential = (row: DbRow): FeedIntegrationCredential => ({
  tokenHash: row.token_hash,
  createdAt: new Date(row.created_at).toISOString(),
  lastUsedAt: row.last_used_at ? new Date(row.last_used_at).toISOString() : null,
});

export const getCredential = async (): Promise<FeedIntegrationCredential | null> => {
  const rows = await getSql()`
    SELECT token_hash, created_at, last_used_at
    FROM feed_integration_credentials
    WHERE id = 'singleton'
  ` as DbRow[];
  return rows[0] ? toCredential(rows[0]) : null;
};

export const replaceCredential = async (tokenHash: string): Promise<FeedIntegrationCredential> => {
  const rows = await getSql()`
    INSERT INTO feed_integration_credentials (id, token_hash, created_at, last_used_at)
    VALUES ('singleton', ${tokenHash}, now(), null)
    ON CONFLICT (id) DO UPDATE SET
      token_hash = EXCLUDED.token_hash,
      created_at = EXCLUDED.created_at,
      last_used_at = null
    RETURNING token_hash, created_at, last_used_at
  ` as DbRow[];
  return toCredential(rows[0]);
};

export const markCredentialUsed = async (): Promise<void> => {
  await getSql()`
    UPDATE feed_integration_credentials
    SET last_used_at = now()
    WHERE id = 'singleton'
  `;
};
