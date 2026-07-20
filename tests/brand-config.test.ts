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

const readPngDimensions = (relativePublicPath: string) => {
  const png = readFileSync(path.resolve(process.cwd(), "public", relativePublicPath.slice(1)));
  expect(png.subarray(1, 4).toString("ascii")).toBe("PNG");
  return [png.readUInt32BE(16), png.readUInt32BE(20)];
};

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

  it("keeps William Temple House as the no-configuration default", () => {
    const profile = getBrandProfile();
    expect(profile.id).toBe(DEFAULT_BRAND_PROFILE_ID);
    expect(profile.appName).toBe("William Temple House App");
    expect(getInventoryIntegration(profile, undefined)).toEqual({
      enabled: true,
      url: "https://feed.williamtemple.app/api/public/inventory.json",
    });
  });

  it("loads St. Johns Food Share as a queue-only profile by default", () => {
    const profile = getBrandProfile("st-johns-food-share");
    expect(profile.organizationName).toBe("St. Johns Food Share");
    expect(profile.publicAppUrl).toBe("https://stjohnsfoodshare.app");
    expect(profile.logo.lightSrc).toBe("/brands/st-johns-food-share/logo.png");
    expect(profile.logo.darkSrc).toBe(
      "/brands/st-johns-food-share/logo_darkmode_outline.png",
    );
    expect([profile.logo.darkWidth, profile.logo.darkHeight]).toEqual([3142, 1340]);
    expect(profile.pwa.browserIcons).toEqual([
      {
        src: "/brands/st-johns-food-share/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        src: "/brands/st-johns-food-share/Icon_32.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        src: "/brands/st-johns-food-share/Icon_64.png",
        sizes: "64x64",
        type: "image/png",
      },
    ]);
    expect(profile.pwa.appleIcons).toEqual([
      {
        src: "/brands/st-johns-food-share/Icon_256.png",
        sizes: "256x256",
        type: "image/png",
      },
    ]);
    expect(getInventoryIntegration(profile, undefined)).toEqual({ enabled: false, url: null });
  });

  it("enables inventory for a queue-only profile only with an explicit FEED URL", () => {
    const profile = getBrandProfile("st-johns-food-share");
    expect(
      getInventoryIntegration(profile, "https://feed.example.org/api/public/inventory.json"),
    ).toEqual({
      enabled: true,
      url: "https://feed.example.org/api/public/inventory.json",
    });
  });

  it("rejects unknown profiles and malformed inventory URLs", () => {
    expect(() => getBrandProfile("not-a-profile")).toThrow("Unknown NEXT_PUBLIC_LOTTO_BRAND");
    expect(() =>
      getInventoryIntegration(getBrandProfile("st-johns-food-share"), "not a URL"),
    ).toThrow("must be an absolute HTTP or HTTPS URL");
  });

  it("validates every registered profile and verifies its local assets", () => {
    for (const profile of Object.values(BRAND_PROFILES)) {
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
    }
  });

  it("matches every St. Johns PNG declaration to the supplied file dimensions", () => {
    const profile = getBrandProfile("st-johns-food-share");
    const icons = [
      ...profile.pwa.browserIcons,
      ...profile.pwa.appleIcons,
      ...profile.pwa.manifestIcons,
    ].filter((icon) => icon.type === "image/png");

    for (const icon of icons) {
      const declaredSize = icon.sizes?.split("x").map(Number);
      expect(declaredSize).toHaveLength(2);
      expect(readPngDimensions(icon.src)).toEqual(declaredSize);
    }
  });

  it("keeps the St. Johns scalable browser icon self-contained", () => {
    const svg = readFileSync(
      path.resolve(process.cwd(), "public/brands/st-johns-food-share/icon.svg"),
      "utf8",
    );

    expect(svg).toContain('viewBox="0 0 5120 5120"');
    expect(svg).toContain('id="Background"');
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svg.replace('http://www.w3.org/2000/svg', "")).not.toMatch(
      /<script|foreignObject|javascript:|data:|https?:\/\/|on[a-z]+=/i,
    );
  });

  it("removes inventory navigation for the St. Johns profile", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_LOTTO_BRAND", "st-johns-food-share");
    vi.stubEnv("NEXT_PUBLIC_FEED_PUBLIC_INVENTORY_URL", "");
    const { navItems, authNavItems } = await import("@/components/navigation/nav-items");
    expect(navItems.map((item) => item.href)).toEqual(["/", "/display", "/arcade"]);
    expect(authNavItems.map((item) => item.href)).toEqual(["/admin", "/display", "/arcade"]);
  });

  it("generates St. Johns manifest identity when its profile is selected", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_LOTTO_BRAND", "st-johns-food-share");
    vi.stubEnv("NEXT_PUBLIC_FEED_PUBLIC_INVENTORY_URL", "");
    const { default: manifest } = await import("@/app/manifest");
    expect(await manifest()).toMatchObject({
      name: "St. Johns Food Share Queue",
      short_name: "St Johns Food Share App",
      theme_color: "#33a478",
      background_color: "#2d2d2d",
      icons: [
        { src: "/brands/st-johns-food-share/Icon_32.png", sizes: "32x32" },
        { src: "/brands/st-johns-food-share/Icon_64.png", sizes: "64x64" },
        { src: "/brands/st-johns-food-share/Icon_128.png", sizes: "128x128" },
        { src: "/brands/st-johns-food-share/Icon_256.png", sizes: "256x256" },
        { src: "/brands/st-johns-food-share/Icon_512.png", sizes: "512x512" },
      ],
    });
  });

  it("scopes St. Johns semantic tokens without replacing the WTH defaults", () => {
    const manifest = readCss("src/app/globals.css");
    const wthCss = readCss("src/app/styles/brands/william-temple-house.css");
    const stJohnsCss = readCss("src/app/styles/brands/st-johns-food-share.css");

    expect(manifest).toContain('@import "./styles/brands/william-temple-house.css"');
    expect(manifest).toContain('@import "./styles/brands/st-johns-food-share.css"');
    expect(wthCss).toContain(":root {");
    expect(wthCss).not.toContain("[data-brand=");
    expect(stJohnsCss).toContain(':root[data-brand="st-johns-food-share"]');
    expect(stJohnsCss).toContain(':root.dark[data-brand="st-johns-food-share"]');
    expect(stJohnsCss).toContain("--primary: oklch(0.644157 0.121025 163.057)");
    expect(stJohnsCss).toContain("--primary-foreground: oklch(0.270912 0.040942 166.051)");
    expect(stJohnsCss).toContain("--background: oklch(0.976139 0 0)");
    expect(stJohnsCss).toContain("--background: oklch(0.297163 0 0)");
    expect(stJohnsCss).toContain("--base-shadow-color: oklch(0.297163 0 0)");
    expect(stJohnsCss).toContain("--serving-label-color: oklch(0.615866 0.113552 163.742)");
    expect(stJohnsCss).toContain("--serving-label-color: oklch(0.853326 0.157288 166.996)");
    expect(stJohnsCss).toContain(
      "linear-gradient(135deg, oklch(0.853326 0.157288 166.996), oklch(0.797833 0.157021 164.211))",
    );
  });

  it("keeps operational status semiotics out of agency brand overrides", () => {
    const brandSources = [
      readCss("src/app/styles/brands/st-johns-food-share.css"),
      readCss("src/app/styles/brands/st-johns-food-share-high-visibility.css"),
    ];

    for (const css of brandSources) {
      expect(css).not.toMatch(/--status-(?:success|warning|danger|neutral)-/);
      expect(css).not.toMatch(/--gradient-status-(?:success|warning|danger)/);
      expect(css).not.toMatch(/--ticket-(?:unclaimed|returned)-text/);
      expect(css).not.toMatch(/--operational-(?:danger|warning|action)-/);
    }
  });

  it("applies St. Johns identity to flat Hi-viz light and dark themes", () => {
    const css = readCss("src/app/styles/brands/st-johns-food-share-high-visibility.css");
    const lightBlock = getCssBlock(css, ':root.hi-viz[data-brand="st-johns-food-share"]');
    const darkBlock = getCssBlock(css, ':root.dark.hi-viz[data-brand="st-johns-food-share"]');

    expect(lightBlock).toContain("--background: oklch(0.976139 0 0)");
    expect(lightBlock).toContain("--primary: oklch(0.615866 0.113552 163.742)");
    expect(lightBlock).toContain("--ticket-served: oklch(0.862589 0.091774 176.466)");
    expect(lightBlock).toContain(
      "--serving-text-gradient: linear-gradient(oklch(0.615866 0.113552 163.742), oklch(0.615866 0.113552 163.742))",
    );
    expect(lightBlock).toContain("--card-gradient: none");
    expect(darkBlock).toContain("--background: oklch(0.297163 0 0)");
    expect(darkBlock).toContain("--primary: oklch(0.875754 0.122685 166.288)");
    expect(darkBlock).toContain("--ticket-served: oklch(0.291497 0.061175 165.135)");
    expect(darkBlock).toContain("--card-gradient: none");
  });

  it("applies a St. Johns palette inside the isolated Arcade theme", () => {
    const manifest = readCss("src/arcade/styles/arcade.css");
    const wthCss = readCss("src/arcade/styles/themes/william-temple-house.css");
    const stJohnsCss = readCss("src/arcade/styles/themes/st-johns-food-share.css");
    const wthDefaultBlock = getCssBlock(wthCss, ".arcade-scope");
    const darkBlock = getCssBlock(
      stJohnsCss,
      'html[data-brand="st-johns-food-share"] .arcade-scope',
    );
    const lightBlock = getCssBlock(
      stJohnsCss,
      'html.light[data-brand="st-johns-food-share"] .arcade-scope',
    );

    expect(manifest).toContain('@import "./themes/william-temple-house.css"');
    expect(manifest).toContain('@import "./themes/st-johns-food-share.css"');
    expect(wthDefaultBlock).toContain("--arcade-wall: oklch(0.617202 0.206468 262.294)");
    expect(wthDefaultBlock).toContain("--arcade-neon: oklch(0.753457 0.223858 334.113)");
    expect(wthDefaultBlock).toContain("--arcade-action-bg: oklch(0.89096 0.145886 91.051)");
    expect(darkBlock).toContain("--arcade-bg: oklch(0.19928 0.03573 181.85)");
    expect(darkBlock).toContain("--arcade-wall: oklch(0.818168 0.200168 155.54)");
    expect(darkBlock).toContain("--arcade-action-bg: oklch(0.976139 0 0)");
    expect(lightBlock).toContain("--arcade-bg: oklch(0.979013 0.00837 168.758)");
    expect(lightBlock).toContain("--arcade-wall: oklch(0.660141 0.11704 183.819)");
    expect(lightBlock).toContain("--arcade-action-bg: oklch(0.820513 0.169062 166.566)");
    expect(lightBlock).toContain("--arcade-text: oklch(0.297163 0 0)");
  });

  it("keeps Arcade brand files limited to Arcade palette tokens", () => {
    const arcadeThemeSources = [
      readCss("src/arcade/styles/themes/william-temple-house.css"),
      readCss("src/arcade/styles/themes/st-johns-food-share.css"),
    ];

    for (const css of arcadeThemeSources) {
      const customProperties = [...css.matchAll(/(--[a-z0-9-]+)\s*:/gi)].map(
        ([, property]) => property,
      );
      expect(customProperties.length).toBeGreaterThan(0);
      expect(
        customProperties.every((property) => property.startsWith("--arcade-")),
      ).toBe(true);
      expect(css).not.toMatch(/--(?:status|operational|ticket)-/);
    }
  });

  it("omits every FEED origin from St. Johns queue-only CSP", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_LOTTO_BRAND", "st-johns-food-share");
    vi.stubEnv("NEXT_PUBLIC_FEED_PUBLIC_INVENTORY_URL", "");
    const { default: nextConfig } = await import("../next.config");
    const headerRules = await nextConfig.headers?.();
    const csp = headerRules?.[0]?.headers.find(
      (header) => header.key === "Content-Security-Policy",
    )?.value;
    expect(csp).toContain("connect-src 'self'");
    expect(csp).not.toContain("feed.williamtemple.app");
  });
});
