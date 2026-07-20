import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // The "server-only" marker throws under vitest's default (non
      // react-server) resolution; map it to its own no-op build so server
      // modules (brand resolver, user guides, AI config) stay testable.
      "server-only": path.resolve(__dirname, "./node_modules/server-only/empty.js"),
    },
    clearMocks: true,
  },
});
