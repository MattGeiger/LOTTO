// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Matt Geiger, Temple Consulting, LLC.

import "server-only";

import { resolveRealtimeCanaryClientConfig, resolveSnapshotUrl } from "./client-canary-config";
import { hashPublicState, publicStateEnvelopeSchema } from "./public-state-protocol";
import type { RealtimeCanaryClientConfig } from "./client-canary-config";

/** Independent of the browser source/application gates and URL cohort. */
export const resolvePublicStateSnapshotConfig = (
  environment: Readonly<Record<string, string | undefined>> = process.env,
): RealtimeCanaryClientConfig | null => {
  const flag = environment.LOTTO_PUBLIC_STATE_SNAPSHOT_ENABLED?.trim().toLowerCase();
  if (!flag || flag === "false") return null;
  if (flag !== "true") {
    throw new Error("LOTTO_PUBLIC_STATE_SNAPSHOT_ENABLED must be either true or false.");
  }
  return resolveRealtimeCanaryClientConfig({
    ...environment,
    LOTTO_REALTIME_APPLICATION_ENABLED: "true",
    LOTTO_REALTIME_CLIENT_CANARY: "true",
  });
};

export const readPublicStateSnapshot = async (config: RealtimeCanaryClientConfig) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3_000);
  try {
    const response = await fetch(resolveSnapshotUrl(config), {
      cache: "no-store",
      redirect: "error",
      signal: controller.signal,
    });
    if (!response.ok) throw new Error("Public snapshot is unavailable.");
    const envelope = publicStateEnvelopeSchema.parse(await response.json());
    if (envelope.agencyId !== config.agencyId) {
      throw new Error("Public snapshot agency does not match.");
    }
    if (await hashPublicState(envelope.state) !== envelope.checksum) {
      throw new Error("Public snapshot checksum does not match.");
    }
    // Elapsed time alone does not imply a missing staff update.
    return envelope;
  } finally {
    clearTimeout(timeout);
  }
};
