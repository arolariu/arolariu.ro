/**
 * @fileoverview Vitest configuration for GitHub Actions helper tests.
 * @module github/scripts/vitest-config
 *
 * @remarks
 * This configuration is scoped to the `.github/scripts` TypeScript helpers and
 * their unit tests.
 *
 * **Runtime**: Node.js.
 *
 * **Coverage**:
 * - Includes `helpers/**/*.ts` (implementation files)
 * - Excludes `**/*.test.ts`, `**/*.spec.ts`, and `**/node_modules/**`
 *
 * @example
 * ```bash
 * npm run test:unit
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
      include: ["helpers/**/*.ts"],
      exclude: ["**/*.test.ts", "**/*.spec.ts", "**/node_modules/**"],
    },
  },
});
