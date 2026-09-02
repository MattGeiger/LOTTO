// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Matt Geiger, Temple Consulting, LLC.

import {
  isRealtimeCanaryCohort,
  isRealtimeSourceCanaryCohort,
  resolveRealtimeCanaryClientConfig,
  resolveRealtimeSourceClientConfig,
} from "@/lib/realtime/client-canary-config";
import { resolveRealtimeCanaryConnectHost } from "../next.config";
import {
  POLLED_STATE_REVISION_HEADER,
  readPolledStateRevision,
} from "@/lib/realtime/polled-state-revision";

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
    expect(isRealtimeSourceCanaryCohort("?realtime=source")).toBe(true);
    expect(isRealtimeSourceCanaryCohort("?realtime=observe")).toBe(false);
  });

  it("keeps the realtime source behind its own beta-only flag", () => {
    expect(resolveRealtimeSourceClientConfig(betaEnvironment)).toBeNull();
    expect(resolveRealtimeSourceClientConfig({
      ...betaEnvironment,
      LOTTO_REALTIME_CLIENT_CANARY: "false",
      LOTTO_REALTIME_SOURCE_CANARY: "true",
    })).toEqual({
      agencyId: "william-temple-house",
      eventsUrl:
        "wss://lotto-realtime-beta.et2-geiger.workers.dev/v1/agencies/william-temple-house/events",
    });
    expect(resolveRealtimeCanaryConnectHost({
      ...betaEnvironment,
      LOTTO_REALTIME_CLIENT_CANARY: "false",
      LOTTO_REALTIME_SOURCE_CANARY: "true",
    })).toBe("wss://lotto-realtime-beta.et2-geiger.workers.dev");
    expect(() => resolveRealtimeSourceClientConfig({
      ...betaEnvironment,
      LOTTO_REALTIME_SOURCE_CANARY: "yes",
    })).toThrow("must be either true or false");
  });

  it("accepts only positive safe integer state-revision headers", () => {
    expect(readPolledStateRevision(new Headers({
      [POLLED_STATE_REVISION_HEADER]: "16",
    }))).toBe(16);
    for (const value of ["", "0", "-1", "1.5", "1e2", "9007199254740992"]) {
      expect(readPolledStateRevision(new Headers({
        [POLLED_STATE_REVISION_HEADER]: value,
      }))).toBeNull();
    }
  });
});
