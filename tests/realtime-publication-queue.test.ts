import { beforeEach, describe, expect, it, vi } from "vitest";
import { enqueuePublicationRepair, processPublicationRepair, publicationRetry } from "@/lib/realtime/publication-queue";
import { send } from "@vercel/queue";

vi.mock("@vercel/queue", () => ({ send: vi.fn().mockResolvedValue({ messageId: "test" }) }));
const job = { agencyId: "william-temple-house", publicationId: "965104d8-44a2-41b7-b7d0-d82d9c9d3a50", revision: 42 };
beforeEach(() => vi.clearAllMocks());

describe("durable publication recovery", () => {
  it("queues a delayed watchdog with stable identity and finite retention", async () => {
    await enqueuePublicationRepair(job);
    expect(send).toHaveBeenCalledWith("lotto-public-state-repair", job, {
      idempotencyKey: job.publicationId, delaySeconds: 30, retentionSeconds: 3600,
    });
  });
  it("rejects invalid and cross-agency jobs before any database access", async () => {
    const repair = vi.fn();
    await processPublicationRepair({ ...job, revision: -1 }, job.agencyId, repair);
    await processPublicationRepair(job, "other-agency", repair);
    expect(repair).not.toHaveBeenCalled();
  });
  it("acknowledges accepted or superseded work without another publication", async () => {
    const repair = vi.fn().mockResolvedValue({ attempted: false });
    await processPublicationRepair(job, job.agencyId, repair);
    expect(repair).toHaveBeenCalledExactlyOnceWith(job.publicationId);
  });
  it("retries failed work and completes after the hub recovers without a new staff edit", async () => {
    const repair = vi.fn().mockResolvedValueOnce({ attempted: true, accepted: false })
      .mockResolvedValueOnce({ attempted: true, accepted: true });
    await expect(processPublicationRepair(job, job.agencyId, repair)).rejects.toThrow("remains pending");
    expect(publicationRetry(new Error(), { deliveryCount: 1 })).toEqual({ afterSeconds: 15 });
    await expect(processPublicationRepair(job, job.agencyId, repair)).resolves.toBeUndefined();
    expect(repair).toHaveBeenCalledTimes(2);
  });
  it("caps backoff and stops at eight deliveries", () => {
    expect(publicationRetry(new Error(), { deliveryCount: 7 })).toEqual({ afterSeconds: 300 });
    expect(publicationRetry(new Error(), { deliveryCount: 8 })).toEqual({ acknowledge: true });
  });
});
