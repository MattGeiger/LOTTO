import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { config, proxy } from "@/proxy";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

describe("Day of the Dead production visibility", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("routes production zombie-attack requests back to the Arcade index", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const response = await proxy(new NextRequest("https://example.com/arcade/zombie-attack"));

    expect(response?.status).toBe(307);
    expect(response?.headers.get("Location")).toBe("https://example.com/arcade");
  });

  it("keeps the internal route available outside production", async () => {
    vi.stubEnv("NODE_ENV", "development");

    const response = await proxy(new NextRequest("https://example.com/arcade/zombie-attack"));

    expect(response?.headers.get("x-middleware-next")).toBe("1");
  });

  it("keeps the proxy matcher scoped to protected and hidden routes", () => {
    expect(config.matcher).toContain("/arcade/zombie-attack/:path*");
  });
});
