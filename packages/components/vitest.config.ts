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
        exclude: ["src/components/**"],
        thresholds: {
          // Override branch threshold for defensive nullish coalescing patterns
          // that cannot realistically be triggered in normal code paths
          branches: 85,
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
