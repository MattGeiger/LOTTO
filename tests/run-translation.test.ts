// SPDX-License-Identifier: AGPL-3.0-or-later

import { afterEach, describe, expect, it, vi } from "vitest";

import { runStagedTranslation } from "@/lib/translation/run-translation";

describe("runStagedTranslation", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("advances a finite queued job and stops as soon as it completes", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            details: { count: 50 },
            processed: { translated: 25, failed: 0, remaining: 25 },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ translated: 25, failed: 0, remaining: 0 }), {
          status: 200,
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(runStagedTranslation()).resolves.toEqual({
      total: 50,
      done: 50,
      remaining: 0,
      failed: 0,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("stops instead of repeatedly requesting a queue that makes no progress", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            details: { count: 50 },
            processed: { translated: 25, failed: 0, remaining: 25 },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ translated: 0, failed: 0, remaining: 25 }), {
          status: 200,
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(runStagedTranslation()).rejects.toThrow("queue did not advance");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("caps follow-up requests when a queue is larger than the safety budget", async () => {
    let processCalls = 0;
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).endsWith("/find-missing")) {
        return new Response(
          JSON.stringify({
            details: { count: 102 },
            processed: { translated: 1, failed: 0, remaining: 101 },
          }),
          { status: 200 },
        );
      }
      processCalls += 1;
      return new Response(
        JSON.stringify({ translated: 1, failed: 0, remaining: 101 - processCalls }),
        { status: 200 },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(runStagedTranslation()).resolves.toEqual({
      total: 102,
      done: 101,
      remaining: 1,
      failed: 0,
    });
    expect(processCalls).toBe(100);
    expect(fetchMock).toHaveBeenCalledTimes(101);
  });
});
