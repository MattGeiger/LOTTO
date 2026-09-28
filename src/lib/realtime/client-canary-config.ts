// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Matt Geiger, Temple Consulting, LLC.

import { isRealtimeEligibleDeployment } from "@/lib/deployment-environment";

import { agencyIdSchema } from "./public-state-protocol";

const DEFAULT_BETA_HUB_HOST = "lotto-realtime-beta.et2-geiger.workers.dev";
export const REALTIME_CANARY_QUERY_VALUE = "observe";
export const REALTIME_SOURCE_CANARY_QUERY_VALUE = "source";
export const REALTIME_POLL_QUERY_VALUE = "poll";

type Environment = Readonly<Record<string, string | undefined>>;

export type RealtimeCanaryClientConfig = {
  agencyId: string;
  eventsUrl: string;
  snapshotUrl?: string;
};

const required = (environment: Environment, name: string) => {
  const value = environment[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required when the realtime client canary is enabled.`);
  }
  return value;
};

export const isRealtimeApplicationEnabled = (
  environment: Environment = process.env,
): boolean => {
  const flag = environment.LOTTO_REALTIME_APPLICATION_ENABLED?.trim().toLowerCase();
  if (!flag) {
    // Backward-compatible for the existing beta canary, which is still
    // independently gated by LOTTO_REALTIME_SOURCE_CANARY and its URL cohort.
    return true;
  }
  if (flag !== "true" && flag !== "false") {
    throw new Error("LOTTO_REALTIME_APPLICATION_ENABLED must be either true or false.");
  }
  return flag === "true";
};

export const resolveRealtimeCanaryClientConfig = (
  environment: Environment = process.env,
): RealtimeCanaryClientConfig | null => {
  if (!isRealtimeApplicationEnabled(environment)) return null;
  const flag = environment.LOTTO_REALTIME_CLIENT_CANARY?.trim().toLowerCase();
  if (!flag || flag === "false") return null;
  if (flag !== "true") {
    throw new Error("LOTTO_REALTIME_CLIENT_CANARY must be either true or false.");
  }
  if (!isRealtimeEligibleDeployment(environment)) {
    throw new Error(
      "Realtime requires LOTTO_DEPLOYMENT_ENVIRONMENT to be exactly \"beta\" or \"production\".",
    );
  }
  const hubUrl = new URL(required(environment, "LOTTO_REALTIME_HUB_URL"));
  if (
    hubUrl.protocol !== "https:"
    || hubUrl.username
    || hubUrl.password
    || hubUrl.search
    || hubUrl.hash
    || (hubUrl.pathname !== "/" && hubUrl.pathname !== "")
  ) {
    throw new Error(
      "LOTTO_REALTIME_HUB_URL must be an HTTPS origin without credentials, path, query, or fragment.",
    );
  }

  const expectedHost =
    environment.LOTTO_REALTIME_EXPECTED_HUB_HOST?.trim()
    ?? DEFAULT_BETA_HUB_HOST;
  if (hubUrl.hostname !== expectedHost) {
    throw new Error(
      `Realtime hub host ${hubUrl.hostname} does not match LOTTO_REALTIME_EXPECTED_HUB_HOST ${expectedHost}.`,
    );
  }

  const agencyId = agencyIdSchema.parse(
    required(environment, "LOTTO_REALTIME_AGENCY_ID"),
  );
  const eventsUrl = new URL(
    `/v1/agencies/${encodeURIComponent(agencyId)}/events`,
    hubUrl.origin,
  );
  eventsUrl.protocol = "wss:";

  return {
    agencyId,
    eventsUrl: eventsUrl.toString(),
    snapshotUrl: new URL(`/v1/agencies/${encodeURIComponent(agencyId)}/state`, hubUrl.origin).toString(),
  };
};

export const resolveRealtimeSourceClientConfig = (
  environment: Environment = process.env,
): RealtimeCanaryClientConfig | null => {
  const flag = environment.LOTTO_REALTIME_SOURCE_CANARY?.trim().toLowerCase();
  if (!flag || flag === "false") return null;
  if (flag !== "true") {
    throw new Error("LOTTO_REALTIME_SOURCE_CANARY must be either true or false.");
  }
  return resolveRealtimeCanaryClientConfig({
    ...environment,
    LOTTO_REALTIME_CLIENT_CANARY: "true",
  });
};

export const isRealtimeCanaryCohort = (search: string): boolean =>
  new URLSearchParams(search).get("realtime") === REALTIME_CANARY_QUERY_VALUE;

export const isRealtimeSourceCanaryCohort = (search: string): boolean =>
  new URLSearchParams(search).get("realtime") === REALTIME_SOURCE_CANARY_QUERY_VALUE;

export const isRealtimePollingOnlyCohort = (search: string): boolean =>
  new URLSearchParams(search).get("realtime") === REALTIME_POLL_QUERY_VALUE;

/** Used by every legacy poll entry point, before any fetch can run. */
export const isRealtimeSourceSelected = (
  config: RealtimeCanaryClientConfig | null | undefined,
  search: string,
): boolean => {
  const mode = new URLSearchParams(search).get("realtime");
  return Boolean(config && (mode === null || mode === REALTIME_SOURCE_CANARY_QUERY_VALUE));
};

export const resolveSnapshotUrl = (config: RealtimeCanaryClientConfig): string => {
  const url = new URL(config.eventsUrl);
  url.protocol = "https:";
  url.pathname = `/v1/agencies/${encodeURIComponent(config.agencyId)}/state`;
  url.search = "";
  url.hash = "";
  // Keep the HTTP trust boundary identical to the validated socket origin.
  if (config.snapshotUrl && config.snapshotUrl !== url.toString()) {
    throw new Error("Snapshot URL must match the configured agency hub.");
  }
  return url.toString();
};
