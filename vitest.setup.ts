import "@testing-library/jest-dom/vitest";
import os from "node:os";
import path from "node:path";

// Isolate the file-backed brand-configuration store from the dev `data/`
// directory: without this, any test touching the brand resolver would read
// (or seed into) the developer's local brand-config.json. Individual tests
// may override BRAND_CONFIG_FILE to point at their own fixtures.
process.env.BRAND_CONFIG_FILE = path.join(
  os.tmpdir(),
  `lotto-brand-config-test-${process.pid}.json`,
);
// Same isolation for the file-backed brand-asset store.
process.env.BRAND_ASSETS_DIR = path.join(
  os.tmpdir(),
  `lotto-brand-assets-test-${process.pid}`,
);
// Pairing credentials are hashes, but tests must still never read or overwrite
// the developer's local token file.
process.env.FEED_INTEGRATION_TOKEN_FILE = path.join(
  os.tmpdir(),
  `lotto-feed-integration-token-test-${process.pid}.json`,
);

// Polyfill IntersectionObserver for jsdom (required by motion/animate-ui icons)
if (typeof globalThis.IntersectionObserver === "undefined") {
  globalThis.IntersectionObserver = class IntersectionObserver {
    readonly root: Element | null = null;
    readonly rootMargin: string = "0px";
    readonly thresholds: ReadonlyArray<number> = [0];
    constructor() {}
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  } as unknown as typeof globalThis.IntersectionObserver;
}

// Radix/animate-ui panels measure their active content after mount. JSDOM does
// not ship ResizeObserver, so provide the no-op shape used by component tests.
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof globalThis.ResizeObserver;
}
