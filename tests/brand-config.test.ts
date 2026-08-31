// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  BRAND_PROFILES,
  DEFAULT_BRAND_PROFILE_ID,
  getBrandProfile,
  getInventoryIntegration,
  validateBrandProfile,
} from "@/config/brand";

const readCss = (relativePath: string) =>
  readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

const getCssBlock = (css: string, selector: string) => {
  const start = css.indexOf(`${selector} {`);
  const end = css.indexOf("\n}", start);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return css.slice(start, end);
};

describe("white-label brand configuration", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("ships one compiled William Temple House profile", () => {
    const profile = getBrandProfile();

    expect(Object.keys(BRAND_PROFILES)).toEqual([DEFAULT_BRAND_PROFILE_ID]);
    expect(profile.id).toBe(DEFAULT_BRAND_PROFILE_ID);
    expect(profile.appName).toBe("William Temple House App");
    expect(getInventoryIntegration(profile, undefined)).toEqual({
      enabled: true,
      url: "https://feed.williamtemple.app/api/public/inventory.json",
    });
  });

  it("rejects malformed inventory URLs", () => {
    expect(() => getInventoryIntegration(getBrandProfile(), "not a URL")).toThrow(
      "must be an absolute HTTP or HTTPS URL",
    );
  });

  it("validates the profile and every referenced local asset", () => {
    const profile = getBrandProfile();
    expect(validateBrandProfile(profile)).toEqual([]);

    const assetPaths = [
      profile.logo.lightSrc,
      profile.logo.darkSrc,
      ...profile.pwa.browserIcons.map((icon) => icon.src),
      ...profile.pwa.appleIcons.map((icon) => icon.src),
      ...profile.pwa.manifestIcons.map((icon) => icon.src),
    ];
    for (const assetPath of new Set(assetPaths)) {
      expect(existsSync(path.resolve(process.cwd(), "public", assetPath.slice(1)))).toBe(true);
    }
  });

  it("uses FEED's current self-contained vector artwork", () => {
    const profile = getBrandProfile();
    expect(profile.logo).toMatchObject({
      lightSrc: "/brand/wth-logo-horizontal-light.svg",
      darkSrc: "/brand/wth-logo-horizontal-dark.svg",
      width: 800,
      height: 300,
    });

    for (const assetPath of [
      profile.logo.lightSrc,
      profile.logo.darkSrc,
      "/brand/wth-app-mark.svg",
    ]) {
      const svg = readFileSync(
        path.resolve(process.cwd(), "public", assetPath.slice(1)),
        "utf8",
      );
      expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
      expect(svg.replace('http://www.w3.org/2000/svg', "")).not.toMatch(
        /<script|foreignObject|javascript:|data:|https?:\/\/|on[a-z]+=/i,
      );
    }
  });

  it("generates the William Temple House manifest identity", async () => {
    const { default: manifest } = await import("@/app/manifest");
    expect(await manifest()).toMatchObject({
      name: "William Temple House App",
      short_name: "William Temple House App",
      theme_color: "#2762a2",
      background_color: "#ffffff",
    });
  });

  it("uses one unscoped compiled theme with legacy-safe FEED Prism stops", () => {
    const manifest = readCss("src/app/globals.css");
    const css = readCss("src/app/styles/brands/william-temple-house.css");

    expect(manifest).toContain('@import "./styles/brands/william-temple-house.css"');
    expect(css).toContain(":root {");
    expect(css).not.toContain("[data-brand=");
    expect(css).toContain("--primary: oklch(0.5000 0.1340 242.7490)");
    expect(css).toContain("--card-gradient-start: oklch(0.936130 0.015956 233.028)");
    expect(css).toContain("--card-gradient-end: oklch(0.984907 0.002861 264.542)");
    expect(css).not.toMatch(/--card-gradient:[^;]*color-mix/);
  });

  it("keeps high visibility shared and brand-neutral", () => {
    const css = readCss("src/app/styles/shared/high-visibility.css");
    const layout = readCss("src/app/layout.tsx");

    expect(css).toContain(":root.hi-viz {");
    expect(css).toContain(":root.dark.hi-viz {");
    expect(css).toContain("--card-gradient: none");
    expect(css).not.toContain("[data-brand=");
    expect(css).not.toMatch(/--app-font-(?:sans|serif|mono)/);
    expect(layout).not.toMatch(/Open_Sans|Bodoni_Moda_SC|IBM_Plex_Mono/);
  });

  it("keeps Arcade on the single WTH palette and limits it to Arcade tokens", () => {
    const manifest = readCss("src/arcade/styles/arcade.css");
    const css = readCss("src/arcade/styles/themes/william-temple-house.css");
    const defaultBlock = getCssBlock(css, ".arcade-scope");

    expect(manifest).toContain('@import "./themes/william-temple-house.css"');
    expect(defaultBlock).toContain("--arcade-wall: oklch(0.617202 0.206468 262.294)");
    expect(defaultBlock).toContain("--arcade-neon: oklch(0.753457 0.223858 334.113)");
    expect(defaultBlock).toContain("--arcade-action-bg: oklch(0.89096 0.145886 91.051)");

    const customProperties = [...css.matchAll(/(--[a-z0-9-]+)\s*:/gi)].map(
      ([, property]) => property,
    );
    expect(customProperties.length).toBeGreaterThan(0);
    expect(customProperties.every((property) => property.startsWith("--arcade-"))).toBe(true);
    expect(css).not.toMatch(/--(?:status|operational|ticket)-/);
  });

  it("keeps the built-in FEED inventory origin in CSP", async () => {
    const { default: nextConfig } = await import("../next.config");
    const headerRules = await nextConfig.headers?.();
    const csp = headerRules?.[0]?.headers.find(
      (header) => header.key === "Content-Security-Policy",
    )?.value;
    expect(csp).toContain("connect-src 'self'");
    expect(csp).toContain("feed.williamtemple.app");
  });
});
