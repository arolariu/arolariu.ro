/**
 * @fileoverview Vitest configuration for the arolariu.ro website.
 * @module sites/arolariu.ro/vitest.config
 *
 * @remarks
 * Extends the monorepo base config with Next.js specific settings.
 *
 * @see https://vitest.dev/config/
 */

import react from "@vitejs/plugin-react";
import {resolve} from "node:path";
import {defineConfig, mergeConfig} from "vitest/config";
import baseConfig from "../../vitest.config";

export default mergeConfig(
  baseConfig,
  defineConfig({
    plugins: [react()],
    test: {
      silent: "passed-only",
      setupFiles: [resolve(__dirname, "./vitest.setup.ts")],
      exclude: ["**/node_modules/**", "**/tests/**"], // Exclude E2E tests directory
      coverage: {
        exclude: ["**/instrumentation.server.ts", "**/instrumentation.ts", "**/.next/**", "**/tests/**"],
      },
    },
    resolve: {
      alias: [
        // ── Stubs: server-only modules that crash in happy-dom ──
        // These MUST come before the general `@/` alias so they take priority.
        // See tests/README.md for the full mock architecture documentation.
        {find: "server-only", replacement: resolve(__dirname, "./tests/stubs/server-only.ts")},
        {find: "@/instrumentation.server", replacement: resolve(__dirname, "./tests/stubs/instrumentation.server.ts")},
        {find: "@/lib/config/configProxy", replacement: resolve(__dirname, "./tests/stubs/lib/config/configProxy.ts")},
        {find: "@/lib/utils.server", replacement: resolve(__dirname, "./tests/stubs/lib/utils.server.ts")},
        {find: "@/lib/azure/storageClient", replacement: resolve(__dirname, "./tests/stubs/lib/azure/storageClient.ts")},
        {
          find: "@/lib/actions/storage/fetchConfig",
          replacement: resolve(__dirname, "./tests/stubs/lib/actions/storage/fetchConfig.ts"),
        },
        {
          find: "@/lib/actions/user/fetchUser",
          replacement: resolve(__dirname, "./tests/stubs/lib/actions/user/fetchUser.ts"),
        },
        // ── General aliases (must come after stubs) ──
        {find: "@", replacement: resolve(__dirname, "./src")},
        {find: "@arolariu/components", replacement: resolve(__dirname, "../../packages/components/dist/index.js")},
      ],
      conditions: ["node", "default"],
      mainFields: ["module", "jsnext:main", "jsnext"],
    },
  }),
);
