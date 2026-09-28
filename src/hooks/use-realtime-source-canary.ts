// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Matt Geiger, Temple Consulting, LLC.
"use client";

import * as React from "react";
import type { RealtimeCanaryClientConfig } from "@/lib/realtime/client-canary-config";
import type { PublicRaffleState } from "@/lib/realtime/public-state-protocol";
import type { RaffleState } from "@/lib/state-types";
import { initialSourceTelemetry, startRealtimeSource, type RealtimeSourceReason, type RealtimeSourceTelemetry } from "@/lib/realtime/source-controller";
export type { RealtimeSourceReason, RealtimeSourceTelemetry } from "@/lib/realtime/source-controller";

declare global {
  interface Window { __LOTTO_REALTIME_SOURCE_CANARY__?: RealtimeSourceTelemetry }
}

export const useRealtimeSourceCanary = ({ config, onState, onAuthorityChange }: {
  config: RealtimeCanaryClientConfig;
  // Retained at the observer boundary; source mode no longer needs DB evidence.
  polledState: RaffleState | null;
  polledRevision: number | null;
  onState: (state: PublicRaffleState, revision: number) => void;
  onAuthorityChange: (authoritative: boolean, reason: RealtimeSourceReason) => void;
}): RealtimeSourceTelemetry => {
  const [telemetry, setTelemetry] = React.useState(initialSourceTelemetry);
  const callbacks = React.useRef({ onState, onAuthorityChange });
  React.useEffect(() => { callbacks.current = { onState, onAuthorityChange }; }, [onState, onAuthorityChange]);
  React.useEffect(() => startRealtimeSource({
    config: { agencyId: config.agencyId, eventsUrl: config.eventsUrl, snapshotUrl: config.snapshotUrl },
    onState: (state, revision) => callbacks.current.onState(state, revision),
    onTelemetry: (value) => {
      setTelemetry(value);
      callbacks.current.onAuthorityChange(value.authority === "live", value.reason);
    },
  }), [config.agencyId, config.eventsUrl, config.snapshotUrl]);
  React.useEffect(() => {
    window.__LOTTO_REALTIME_SOURCE_CANARY__ = telemetry;
    window.dispatchEvent(new CustomEvent("lotto:realtime-source-canary", { detail: telemetry }));
  }, [telemetry]);
  React.useEffect(() => () => { delete window.__LOTTO_REALTIME_SOURCE_CANARY__; }, []);
  return telemetry;
};
