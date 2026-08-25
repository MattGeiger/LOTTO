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
  // Uploaded brand logos may be SVGs (kept vector for crisp hi-DPI
  // rendering). next/image refuses SVG sources unless explicitly allowed;
  // the paired CSP sandboxes every optimizer response so an SVG document can
  // never script, and uploads are already validated self-contained by
  // src/lib/brand-config/assets.ts.
  images: {
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'none'; style-src 'unsafe-inline'; sandbox;",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
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
              "img-src 'self' data: blob: https://*.public.blob.vercel-storage.com",
              "font-src 'self'",
              connectSrc,
              frameAncestors,
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
      {
        // Stored brand assets may be operator-uploaded SVG documents. They
        // are validated inert at upload (src/lib/brand-config/assets.ts);
        // this stricter CSP is defense in depth so a directly-navigated SVG
        // can never script or load anything, even if validation were ever
        // bypassed. Last matching rule wins for the same header key, so this
        // overrides the site-wide policy above for assets only.
        source: "/api/brand-assets/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "default-src 'none'; style-src 'unsafe-inline'; sandbox",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
