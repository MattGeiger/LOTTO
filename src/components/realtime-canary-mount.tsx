// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Matt Geiger, Temple Consulting, LLC.

"use client";

import * as React from "react";

import {
  isRealtimeCanaryCohort,
  type RealtimeCanaryClientConfig,
} from "@/lib/realtime/client-canary-config";
import type { RaffleState } from "@/lib/state-types";

const RealtimeCanaryObserver = React.lazy(
  () => import("@/components/realtime-canary-observer"),
);

export default function RealtimeCanaryMount({
  config,
  polledState,
  polledRevision,
}: {
  config: RealtimeCanaryClientConfig | null;
  polledState: RaffleState | null;
  polledRevision: number | null;
}) {
  const [selected, setSelected] = React.useState(false);

  React.useEffect(() => {
    setSelected(Boolean(config && isRealtimeCanaryCohort(window.location.search)));
  }, [config]);

  if (!config || !selected) return null;

  return (
    <React.Suspense fallback={null}>
      <RealtimeCanaryObserver
        config={config}
        polledState={polledState}
        polledRevision={polledRevision}
      />
    </React.Suspense>
  );
}
