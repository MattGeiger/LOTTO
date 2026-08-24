// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Matt Geiger, Temple Consulting, LLC.

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  authorizeFeedIntegrationToken,
  generateFeedIntegrationToken,
  getFeedIntegrationStatus,
} from "@/lib/feed-integration-token/index";

const tokenFile = path.join(os.tmpdir(), `lotto-feed-token-${process.pid}-${Math.random()}.json`);

describe("FEED integration token", () => {
  beforeEach(async () => {
    process.env.FEED_INTEGRATION_TOKEN_FILE = tokenFile;
    delete process.env.LOTTO_FEED_INTEGRATION_TOKEN;
    await fs.rm(tokenFile, { force: true });
  });

  afterEach(async () => {
    delete process.env.LOTTO_FEED_INTEGRATION_TOKEN;
    await fs.rm(tokenFile, { force: true });
  });

  it("stores only a hash and invalidates the previous token immediately", async () => {
    const first = await generateFeedIntegrationToken();
    expect(await authorizeFeedIntegrationToken(`Bearer ${first.token}`)).toBe(true);

    const second = await generateFeedIntegrationToken();
    expect(second.token).not.toBe(first.token);
    expect(await authorizeFeedIntegrationToken(`Bearer ${first.token}`)).toBe(false);
    expect(await authorizeFeedIntegrationToken(`Bearer ${second.token}`)).toBe(true);

    const stored = await fs.readFile(tokenFile, "utf8");
    expect(stored).not.toContain(first.token);
    expect(stored).not.toContain(second.token);
    expect(JSON.parse(stored).tokenHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("uses the deployment token only until an in-app token exists", async () => {
    process.env.LOTTO_FEED_INTEGRATION_TOKEN = "legacy-environment-token";
    expect(await getFeedIntegrationStatus()).toMatchObject({
      configured: true,
      source: "environment",
    });
    expect(await authorizeFeedIntegrationToken("Bearer legacy-environment-token")).toBe(true);

    const generated = await generateFeedIntegrationToken();
    expect(await getFeedIntegrationStatus()).toMatchObject({
      configured: true,
      source: "database",
    });
    expect(await authorizeFeedIntegrationToken("Bearer legacy-environment-token")).toBe(false);
    expect(await authorizeFeedIntegrationToken(`Bearer ${generated.token}`)).toBe(true);
  });

  it("rejects missing and malformed authorization without revealing state", async () => {
    await generateFeedIntegrationToken();
    expect(await authorizeFeedIntegrationToken(null)).toBe(false);
    expect(await authorizeFeedIntegrationToken("Basic credentials")).toBe(false);
    expect(await authorizeFeedIntegrationToken("Bearer wrong-token")).toBe(false);
  });
});
