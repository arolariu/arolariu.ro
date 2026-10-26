/**
 * @fileoverview Vitest configuration for CI brokers, services, and native integration contracts.
 * @module github/scripts/vitest-config
 *
 * @remarks
 * This configuration is scoped to `.github/scripts`; root-tooling AST/worker
 * contracts run separately through scripts/vitest.config.ts.
 *
 * **Runtime**: Node.js.
 *
 * **Coverage**:
 * - Includes helper and lib implementations.
 * - Excludes test/spec/fixture files and node_modules content.
 *
 * @example
 * ```bash
 * npm --prefix .github/scripts test
 * ```
 */
import {defineConfig} from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["helpers/**/*.ts", "lib/**/*.ts"],
      exclude: ["**/*.test.ts", "**/*.spec.ts", "**/*.d.ts", "**/fixtures/**", "**/node_modules/**"],
    },
  },
});
