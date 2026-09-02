// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Matt Geiger, Temple Consulting, LLC.

import { isBetaDeployment } from "@/lib/deployment-environment";

import { agencyIdSchema } from "./public-state-protocol";

const DEFAULT_BETA_HUB_HOST = "lotto-realtime-beta.et2-geiger.workers.dev";
export const REALTIME_CANARY_QUERY_VALUE = "observe";
export const REALTIME_SOURCE_CANARY_QUERY_VALUE = "source";

type Environment = Readonly<Record<string, string | undefined>>;

export type RealtimeCanaryClientConfig = {
  agencyId: string;
  eventsUrl: string;
};

const required = (environment: Environment, name: string) => {
  const value = environment[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required when the realtime client canary is enabled.`);
  }
  return value;
};

export const resolveRealtimeCanaryClientConfig = (
  environment: Environment = process.env,
): RealtimeCanaryClientConfig | null => {
  const flag = environment.LOTTO_REALTIME_CLIENT_CANARY?.trim().toLowerCase();
  if (!flag || flag === "false") return null;
  if (flag !== "true") {
    throw new Error("LOTTO_REALTIME_CLIENT_CANARY must be either true or false.");
  }
  if (!isBetaDeployment(environment)) {
    throw new Error(
      "The realtime client canary is restricted to LOTTO_DEPLOYMENT_ENVIRONMENT=beta during the proof.",
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

  return { agencyId, eventsUrl: eventsUrl.toString() };
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
