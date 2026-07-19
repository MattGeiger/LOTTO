import type { NextConfig } from "next";
import { getBrandProfile, getInventoryIntegration } from "./src/config/brand";

const enableTweakcnPreview = process.env.VERCEL !== "1";
const speedInsightsScriptHost = "https://va.vercel-scripts.com";
const speedInsightsConnectHost = "https://vitals.vercel-insights.com";
const brandProfile = getBrandProfile(process.env.NEXT_PUBLIC_LOTTO_BRAND);
const inventoryIntegration = getInventoryIntegration(brandProfile);
const feedPublicInventoryHost = inventoryIntegration.url
  ? new URL(inventoryIntegration.url).origin
  : null;

const scriptSrc = enableTweakcnPreview
  ? `script-src 'self' 'unsafe-inline' ${speedInsightsScriptHost} https://tweakcn.com https://*.tweakcn.com`
  : `script-src 'self' 'unsafe-inline' ${speedInsightsScriptHost}`;

const connectSrcHosts = [
  "'self'",
  speedInsightsConnectHost,
  speedInsightsScriptHost,
  feedPublicInventoryHost,
  ...(enableTweakcnPreview ? ["https://tweakcn.com", "https://*.tweakcn.com"] : []),
].filter(Boolean);
const connectSrc = `connect-src ${connectSrcHosts.join(" ")}`;

const frameAncestors = enableTweakcnPreview
  ? "frame-ancestors 'self' https://tweakcn.com https://*.tweakcn.com"
  : "frame-ancestors 'none'";

const nextConfig: NextConfig = {
  productionBrowserSourceMaps: false,
  turbopack: {},
  webpack: (config, { isServer, dev }) => {
    if (isServer && !dev && !process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is required for production builds.");
    }
    return config;
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              scriptSrc,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob:",
              "font-src 'self'",
              connectSrc,
              frameAncestors,
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
