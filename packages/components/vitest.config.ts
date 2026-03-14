/**
 * Vitest configuration for @arolariu/components library.
 * Extends the base monorepo config with component-library-specific settings.
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
        exclude: [
          // ── Base config exclusions (mergeConfig replaces arrays) ──
          "**/node_modules/**",
          "**/dist/**",
          "**/.next/**",
          "**/.rslib/**",
          "**/build/**",
          "**/out/**",
          "**/coverage/**",
          "**/storybook-static/**",
          "**/*.stories.{ts,tsx,js,jsx}",
          "**/.storybook/**",
          "**/*.d.ts",
          "**/types/**/*.ts",
          "**/{generated,__generated__}/**",
          "**/*.generated.{ts,tsx,js,jsx}",
          "**/*.test.{ts,tsx,js,jsx}",
          "**/*.spec.{ts,tsx,js,jsx}",
          "**/*.config.{js,ts,mjs,mts}",
          "**/*.setup.{js,ts,mjs,mts}",
          "**/telemetry.ts",
          "**/instrumentation.ts",
          "**/proxy.ts",

          // ── Component library specific ──
          // CSS Modules — not instrumentable via v8
          "**/*.css",
          // Barrel re-export files — no logic to cover
          "**/index.ts",
          // Build scripts — not runtime code
          "**/scripts/**",
          // Pure re-export hooks — no local logic
          "**/useReducedMotion.tsx",
        ],
        thresholds: {
          branches: 70,
          functions: 80,
          lines: 80,
          statements: 80,
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
