/**
 * Vitest configuration for the arolariu.ro Next.js application
 * Extends the base monorepo config with Next.js specific settings
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
      setupFiles: [resolve(__dirname, "./vitest.setup.ts")],
      coverage: {
        exclude: [
          "**/instrumentation.server.ts",
          "**/instrumentation.ts",
          "**/node_modules/**",
          "**/dist/**",
          "**/.next/**",
          "**/.rslib/**",
          "**/build/**",
          "**/storybook-static/**",
          "**/*.spec.{ts,tsx,js,jsx}",
        ],
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
