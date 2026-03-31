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
        // Stub server-only modules in tests (MUST come before general @/ alias)
        {find: "server-only", replacement: resolve(__dirname, "./vitest-stubs/server-only.ts")},
        {find: "@/instrumentation.server", replacement: resolve(__dirname, "./vitest-stubs/instrumentation.server.ts")},
        {find: "@/lib/config/configProxy", replacement: resolve(__dirname, "./vitest-stubs/lib/config/configProxy.ts")},
        {find: "@/lib/utils.server", replacement: resolve(__dirname, "./vitest-stubs/lib/utils.server.ts")},
        {
          find: "@/lib/actions/storage/fetchConfig",
          replacement: resolve(__dirname, "./vitest-stubs/lib/actions/storage/fetchConfig.ts"),
        },
        // General aliases (must come after specific ones)
        {find: "@", replacement: resolve(__dirname, "./src")},
        {find: "@arolariu/components", replacement: resolve(__dirname, "../../packages/components/dist/index.js")},
      ],
      conditions: ["node", "default"],
      mainFields: ["module", "jsnext:main", "jsnext"],
    },
  }),
);
