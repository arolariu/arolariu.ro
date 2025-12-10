/**
 * Base Vitest configuration for the arolariu.ro monorepo
 * This config should be extended by individual packages
 *
 * @see https://vitest.dev/config/
 */

import react from "@vitejs/plugin-react";
import {defineConfig} from "vitest/config";

const weAreInCI = Boolean(process.env["CI"]);

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    pool: "forks",
    testTimeout: 10000, // 10 seconds for each test
    hookTimeout: 20000, // 20 seconds for before/after hooks
    teardownTimeout: 5000, // 5 seconds for teardown
    bail: 0, // Do not stop after first failure
    mockReset: true, // Reset mocks between tests
    clearMocks: true, // Clear mock history between tests
    restoreMocks: true, // Restore original implementations
    retry: weAreInCI ? 2 : 0, // Retry twice in CI, none locally

    // Only include .test.* files (not .spec.* which are Playwright E2E tests)
    include: ["**/?(*.)+(test).[tj]s?(x)"],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/.rslib/**",
      "**/build/**",
      "**/storybook-static/**",
      "**/*.spec.{ts,tsx,js,jsx}", // Exclude Playwright E2E tests
    ],

    coverage: {
      enabled: true,
      clean: true,
      provider: "v8",
      reporter: [
        "html", // Human-readable HTML reports
        "text", // Console output
        "text-summary", // Brief console summary
        "json", // Machine-readable JSON
        "json-summary", // Summary in JSON
        "lcov", // Standard lcov format
        "clover", // Jenkins/CI integration
        "cobertura", // Azure DevOps integration
      ],
      reportsDirectory: "./coverage/vitest",
      thresholds: {
        branches: 90, // 90% branch coverage
        functions: 90, // 90% function coverage
        lines: 90, // 90% line coverage
        statements: 90, // 90% statement coverage
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

        // Test files
        "**/*.test.{ts,tsx,js,jsx}",
        "**/*.spec.{ts,tsx,js,jsx}",

        // Configuration files
        "**/*.config.{js,ts,mjs,mts}",
        "**/*.setup.{js,ts,mjs,mts}",

        // Infrastructure files with module-level side effects
        "**/telemetry.ts",
        "**/instrumentation.ts",
        "**/proxy.ts",
      ],
    },
  },
});
