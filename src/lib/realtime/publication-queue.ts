// SPDX-License-Identifier: AGPL-3.0-or-later
import "server-only";
import { send, type MessageMetadata, type RetryDirective } from "@vercel/queue";
import { z } from "zod";
import { agencyIdSchema } from "./public-state-protocol";

export const PUBLICATION_TOPIC = "lotto-public-state-repair";
export const MAX_PUBLICATION_DELIVERIES = 8;
export const publicationRepairSchema = z.object({
  agencyId: agencyIdSchema,
  publicationId: z.string().uuid(),
  revision: z.number().int().positive().safe(),
}).strict();
export type PublicationRepair = z.infer<typeof publicationRepairSchema>;

export async function enqueuePublicationRepair(job: PublicationRepair): Promise<void> {
  const payload = publicationRepairSchema.parse(job);
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    // A lost response can still mean an accepted message. Stable identity makes
    // retries safe, and the consumer checks the persisted outbox before work.
    await Promise.race([
      send(PUBLICATION_TOPIC, payload, { idempotencyKey: payload.publicationId, delaySeconds: 30, retentionSeconds: 3_600 }),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("Publication recovery enqueue timed out.")), 3_000); }),
    ]);
  } finally { if (timer) clearTimeout(timer); }
}

export function publicationRetry(_error: unknown, metadata: Pick<MessageMetadata, "deliveryCount">): RetryDirective {
  if (metadata.deliveryCount >= MAX_PUBLICATION_DELIVERIES) {
    console.error("[Realtime] Publication recovery budget exhausted; review Admin realtime diagnostics.");
    return { acknowledge: true };
  }
  return { afterSeconds: Math.min(300, 15 * 2 ** Math.max(0, metadata.deliveryCount - 1)) };
}

export async function processPublicationRepair(
  message: unknown,
  agencyId: string | undefined,
  repair: (publicationId: string) => Promise<{ attempted: boolean; accepted?: boolean }>,
): Promise<void> {
  const job = publicationRepairSchema.safeParse(message);
  if (!job.success || job.data.agencyId !== agencyId) {
    // Invalid cross-agency work is terminal and never reaches the datastore.
    console.error("[Realtime] Rejected invalid publication recovery job.");
    return;
  }
  const result = await repair(job.data.publicationId);
  console.info("[Realtime] Publication recovery result", {
    publicationId: job.data.publicationId,
    revision: job.data.revision,
    attempted: result.attempted,
    accepted: result.accepted ?? null,
  });
  if (result.attempted && !result.accepted) throw new Error("Realtime publication remains pending.");
}
