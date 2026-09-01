// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.

import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { BetaEnvironmentBanner } from "@/components/beta-environment-banner";
import { isBetaDeployment } from "@/lib/deployment-environment";
import robots from "@/app/robots";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("beta deployment safety", () => {
  it("recognizes only the explicit beta environment value", () => {
    expect(isBetaDeployment({ LOTTO_DEPLOYMENT_ENVIRONMENT: "beta" })).toBe(true);
    expect(isBetaDeployment({ LOTTO_DEPLOYMENT_ENVIRONMENT: "production" })).toBe(false);
    expect(isBetaDeployment({ LOTTO_DEPLOYMENT_ENVIRONMENT: undefined })).toBe(false);
  });

  it("shows the warning banner only in beta", () => {
    vi.stubEnv("LOTTO_DEPLOYMENT_ENVIRONMENT", "beta");
    const { unmount } = render(<BetaEnvironmentBanner />);
    expect(screen.getByLabelText("Beta test environment")).toHaveTextContent(
      "Data and actions here do not affect the production LOTTO app.",
    );
    unmount();

    vi.stubEnv("LOTTO_DEPLOYMENT_ENVIRONMENT", "production");
    render(<BetaEnvironmentBanner />);
    expect(screen.queryByLabelText("Beta test environment")).not.toBeInTheDocument();
  });

  it("disallows crawling in beta and allows it otherwise", () => {
    vi.stubEnv("LOTTO_DEPLOYMENT_ENVIRONMENT", "beta");
    expect(robots()).toEqual({ rules: { userAgent: "*", disallow: "/" } });

    vi.stubEnv("LOTTO_DEPLOYMENT_ENVIRONMENT", "production");
    expect(robots()).toEqual({ rules: { userAgent: "*", allow: "/" } });
  });

  it("adds X-Robots-Tag only to the beta header policy", async () => {
    vi.stubEnv("LOTTO_DEPLOYMENT_ENVIRONMENT", "beta");
    vi.resetModules();
    const betaConfig = (await import("../next.config")).default;
    const betaHeaders = await betaConfig.headers?.();
    expect(betaHeaders?.[0]?.headers).toContainEqual({
      key: "X-Robots-Tag",
      value: "noindex, nofollow, noarchive, nosnippet",
    });

    vi.stubEnv("LOTTO_DEPLOYMENT_ENVIRONMENT", "production");
    vi.resetModules();
    const productionConfig = (await import("../next.config")).default;
    const productionHeaders = await productionConfig.headers?.();
    expect(
      productionHeaders?.[0]?.headers.some((header) => header.key === "X-Robots-Tag"),
    ).toBe(false);
  });
});
