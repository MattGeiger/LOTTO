// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Matt Geiger, Temple Consulting, LLC.

export interface FeedIntegrationCredential {
  tokenHash: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export interface FeedIntegrationCredentialStatus {
  configured: boolean;
  source: "database" | "environment" | null;
  createdAt: string | null;
  lastUsedAt: string | null;
}
