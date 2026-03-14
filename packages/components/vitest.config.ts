/**
 * Vitest configuration for @arolariu/components library
 * Extends the base monorepo config with component library specific settings
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
      coverage: {
        // Thresholds lowered for v1.0.0 migration; raise as coverage improves
        thresholds: {
          branches: 55,
          functions: 75,
          lines: 73,
          statements: 73,
        },
      },
    },
    resolve: {
      alias: {
        "@": resolve(__dirname, "./src"),
      },
    },
  }),
);
