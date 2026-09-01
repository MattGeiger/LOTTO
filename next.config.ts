import type { NextConfig } from "next";
import { getBrandProfile, getInventoryIntegration } from "./src/config/brand";
import { isBetaDeployment } from "./src/lib/deployment-environment";

const enableTweakcnPreview = process.env.VERCEL !== "1";
const speedInsightsScriptHost = "https://va.vercel-scripts.com";
const speedInsightsConnectHost = "https://vitals.vercel-insights.com";
const brandProfile = getBrandProfile();
const inventoryIntegration = getInventoryIntegration(brandProfile);
const feedPublicInventoryHost = inventoryIntegration.url
  ? new URL(inventoryIntegration.url).origin
  : null;

// React's development build calls eval() to reconstruct callstacks across the
// server/client boundary. Modern engines take a different path, but older
// WebKit (the iPadOS 15 support floor, see docs/BROWSER_SUPPORT.md) falls back
// to eval, and blocking it aborts hydration silently — the page renders and
// never becomes interactive, with the failure reported only via console.error.
// This relaxation is development-only; the production policy is unchanged and
// must never carry 'unsafe-eval'.
const isDevelopment = process.env.NODE_ENV !== "production";
const devEvalSource = isDevelopment ? " 'unsafe-eval'" : "";

const scriptSrc = enableTweakcnPreview
  ? `script-src 'self' 'unsafe-inline'${devEvalSource} ${speedInsightsScriptHost} https://tweakcn.com https://*.tweakcn.com`
  : `script-src 'self' 'unsafe-inline'${devEvalSource} ${speedInsightsScriptHost}`;

const connectSrcHosts = [
  "'self'",
  // Older WebKit does not treat ws:/wss: as covered by 'self', so the dev
  // hot-reload socket is refused by connect-src on the iPadOS 15 floor.
  // Development only; the production policy is unchanged.
  ...(isDevelopment ? ["ws://localhost:*", "ws://127.0.0.1:*", "wss://localhost:*"] : []),
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
    const indexingHeaders = isBetaDeployment()
      ? [
          {
            key: "X-Robots-Tag",
            value: "noindex, nofollow, noarchive, nosnippet",
          },
        ]
      : [];

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
          ...indexingHeaders,
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
