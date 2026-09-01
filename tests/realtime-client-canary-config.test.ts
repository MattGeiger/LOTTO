// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Matt Geiger, Temple Consulting, LLC.

import {
  isRealtimeCanaryCohort,
  resolveRealtimeCanaryClientConfig,
} from "@/lib/realtime/client-canary-config";
import { resolveRealtimeCanaryConnectHost } from "../next.config";

const betaEnvironment = {
  LOTTO_DEPLOYMENT_ENVIRONMENT: "beta",
  LOTTO_REALTIME_CLIENT_CANARY: "true",
  LOTTO_REALTIME_HUB_URL: "https://lotto-realtime-beta.et2-geiger.workers.dev",
  LOTTO_REALTIME_AGENCY_ID: "william-temple-house",
} as const;

describe("realtime client canary configuration", () => {
  it("is disabled unless the server-side flag is exactly true", () => {
    expect(resolveRealtimeCanaryClientConfig({})).toBeNull();
    expect(resolveRealtimeCanaryClientConfig({ LOTTO_REALTIME_CLIENT_CANARY: "false" })).toBeNull();
    expect(() =>
      resolveRealtimeCanaryClientConfig({ LOTTO_REALTIME_CLIENT_CANARY: "yes" }),
    ).toThrow("must be either true or false");
  });

  it("builds only the allowlisted beta WebSocket endpoint", () => {
    expect(resolveRealtimeCanaryClientConfig(betaEnvironment)).toEqual({
      agencyId: "william-temple-house",
      eventsUrl:
        "wss://lotto-realtime-beta.et2-geiger.workers.dev/v1/agencies/william-temple-house/events",
    });
    expect(resolveRealtimeCanaryConnectHost(betaEnvironment)).toBe(
      "wss://lotto-realtime-beta.et2-geiger.workers.dev",
    );
  });

  it("rejects production, non-HTTPS, unexpected hosts, and non-origin URLs", () => {
    expect(() =>
      resolveRealtimeCanaryClientConfig({
        ...betaEnvironment,
        LOTTO_DEPLOYMENT_ENVIRONMENT: "production",
      }),
    ).toThrow("restricted to LOTTO_DEPLOYMENT_ENVIRONMENT=beta");
    expect(() =>
      resolveRealtimeCanaryClientConfig({
        ...betaEnvironment,
        LOTTO_REALTIME_HUB_URL: "http://lotto-realtime-beta.et2-geiger.workers.dev",
      }),
    ).toThrow("must be an HTTPS origin");
    expect(() =>
      resolveRealtimeCanaryClientConfig({
        ...betaEnvironment,
        LOTTO_REALTIME_HUB_URL: "https://attacker.example",
      }),
    ).toThrow("does not match LOTTO_REALTIME_EXPECTED_HUB_HOST");
    expect(() =>
      resolveRealtimeCanaryClientConfig({
        ...betaEnvironment,
        LOTTO_REALTIME_HUB_URL: "https://lotto-realtime-beta.et2-geiger.workers.dev/path",
      }),
    ).toThrow("must be an HTTPS origin");
  });

  it("selects only an explicit browser cohort", () => {
    expect(isRealtimeCanaryCohort("?realtime=observe")).toBe(true);
    expect(isRealtimeCanaryCohort("?realtime=apply")).toBe(false);
    expect(isRealtimeCanaryCohort("?other=observe")).toBe(false);
    expect(isRealtimeCanaryCohort("")).toBe(false);
  });
});
