// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Matt Geiger, Temple Consulting, LLC.

"use client";

import type { RealtimeCanaryClientConfig } from "@/lib/realtime/client-canary-config";
import type { RaffleState } from "@/lib/state-types";
import { useRealtimeCanary } from "@/hooks/use-realtime-canary";

const comparisonLabel = {
  waiting: "Waiting for comparison",
  matched: "Neon match",
  "hub-ahead": "Hub ahead; polling unchanged",
  mismatch: "State mismatch",
} as const;

export default function RealtimeCanaryObserver({
  config,
  polledState,
}: {
  config: RealtimeCanaryClientConfig;
  polledState: RaffleState | null;
}) {
  const telemetry = useRealtimeCanary(config, polledState);

  return (
    <aside
      data-testid="realtime-canary-observer"
      data-connection={telemetry.connection}
      data-comparison={telemetry.comparison}
      className="fixed bottom-24 left-3 z-50 max-w-[min(22rem,calc(100vw-1.5rem))] rounded-md border border-border/70 bg-card/95 px-3 py-2 text-[11px] leading-4 text-muted-foreground shadow-md backdrop-blur"
      aria-label="Realtime beta observer"
      aria-live="polite"
    >
      <span className="font-semibold text-foreground">Realtime observer</span>
      {" · "}
      <span>{telemetry.connection}</span>
      {telemetry.hubRevision !== null ? ` · hub r${telemetry.hubRevision}` : ""}
      {" · "}
      <span>{comparisonLabel[telemetry.comparison]}</span>
      {telemetry.convergenceMs !== null ? ` in ${telemetry.convergenceMs}ms` : ""}
    </aside>
  );
}
