// SPDX-License-Identifier: AGPL-3.0-or-later
import { handleCallback } from "@vercel/queue";
import { stateManager } from "@/lib/state-manager";
import { isRealtimeEligibleDeployment } from "@/lib/deployment-environment";
import { processPublicationRepair, publicationRetry } from "@/lib/realtime/publication-queue";

export const runtime = "nodejs";
export const maxDuration = 60;

// vercel.json makes this a private queue consumer, with no public HTTP URL.
// Local adapters must also authenticate through handleCallback, never proxy auth.
const callback = handleCallback(async (message: unknown) => {
  if (!isRealtimeEligibleDeployment() || process.env.LOTTO_REALTIME_REPAIR_QUEUE_ENABLED === "false") return;
  await processPublicationRepair(message, process.env.LOTTO_REALTIME_AGENCY_ID, async publicationId => {
    if (!("retryLatestRealtimePublication" in stateManager)) throw new Error("Publication storage unavailable.");
    return stateManager.retryLatestRealtimePublication(publicationId);
  });
}, { retry: publicationRetry });

export async function POST(request: Request) { return callback(request); }
