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
      coverage: {
        exclude: ["**/instrumentation.server.ts", "**/instrumentation.ts", "**/.next/**"],
      },
    },
    resolve: {
      alias: {
        "@": resolve(__dirname, "./src"),
        "@arolariu/components": resolve(__dirname, "../../packages/components/src/index.ts"),
      },
    },
  }),
);
