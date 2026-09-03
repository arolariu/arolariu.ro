/**
 * @fileoverview Vitest configuration for monorepo script tooling.
 * @module scripts.vitest-config
 *
 * @remarks
 * Script tests execute in Node.js and own their coverage policy independently from
 * website and package test projects.
 */

import {resolve} from "node:path";
import {defineConfig} from "vitest/config";

const weAreInCI = Boolean(process.env["CI"]);

export default defineConfig({
  root: resolve(import.meta.dirname, ".."),
  test: {
    globals: true,
    environment: "node",
    pool: "threads",
    testTimeout: 10_000,
    hookTimeout: 20_000,
    teardownTimeout: 5_000,
    bail: 0,
    mockReset: true,
    clearMocks: true,
    restoreMocks: true,
    retry: weAreInCI ? 2 : 0,
    include: ["scripts/**/?(*.)+(test).[tj]s?(x)"],
    exclude: ["**/node_modules/**", "**/*.spec.{ts,tsx,js,jsx}"],
    coverage: {
      enabled: true,
      clean: true,
      provider: "v8",
      reporter: ["html", "text", "text-summary", "json", "json-summary", "lcov", "clover", "cobertura"],
      reportsDirectory: "./code-cov/vitest",
      thresholds: {
        branches: 90,
        functions: 90,
        lines: 90,
        statements: 90,
      },
      exclude: [
        // Transient artifacts
        "**/node_modules/**",
        "**/dist/**",
        "**/.next/**",
        "**/.rslib/**",
        "**/build/**",
        "**/out/**",
        "**/coverage/**",

        // Storybook
        "**/storybook-static/**",
        "**/*.stories.{ts,tsx,js,jsx}",
        "**/.storybook/**",

        // Type definitions
        "**/*.d.ts",
        "**/types/**/*.ts",

        // Generated files
        "**/{generated,__generated__}/**",
        "**/*.generated.{ts,tsx,js,jsx}",

        // Test support and test files
        "**/*.test.{ts,tsx,js,jsx}",
        "**/*.spec.{ts,tsx,js,jsx}",
        "scripts/common/runtime.testing.ts",

        // Configuration and setup files
        "**/*.config.{js,ts,mjs,mts}",
        "**/*.setup.{js,ts,mjs,mts}",

        // Script entrypoints and adapters exercised through focused contract tests
        "scripts/container-runtime/aspire.ts",
        "scripts/container-runtime/compose.ts",
        "scripts/container-runtime/image.ts",
        "scripts/container-runtime/selfhost.ts",
        "scripts/inspection/aggregate-worker.ts",
        "scripts/**/*.worker.ts",
        "scripts/workers/shell.ts",
      ],
    },
  },
});
