/**
 * Vitest configuration for @arolariu/components library.
 * Extends the base monorepo config with component-library-specific settings.
 *
 * @see https://vitest.dev/config/
 */

import {resolve} from "node:path";
import {defineConfig, mergeConfig} from "vitest/config";
import baseConfig from "../../vitest.config.ts";

const compilerFiles = ["src/jsdoc-contracts.test.ts", "src/type-contracts.test.ts"];
const surfaceFiles = ["src/index.test.ts"];
const domSetup = ["./vitest.setup.ts"];
const packed = Boolean(process.env["AROLARIU_COMPONENTS_PACKED_ROOT"]);

export default mergeConfig(
  {
    ...baseConfig,
    test: {
      ...baseConfig.test,
      include: [],
      setupFiles: [],
      coverage: {...baseConfig.test?.coverage, exclude: packed ? baseConfig.test?.coverage?.exclude : []},
    },
  },
  defineConfig({
    test: {
      // Compiler programs contend for memory and CPU if they overlap with one another or the DOM suite.
      projects: [
        {
          extends: true,
          test: {name: "compiler", include: compilerFiles, environment: "node", fileParallelism: false, sequence: {groupOrder: 1}},
        },
        {
          extends: true,
          test: {name: "public-surface", include: surfaceFiles, setupFiles: domSetup, sequence: {groupOrder: 2}},
        },
        {
          extends: true,
          test: {
            name: "runtime",
            include: baseConfig.test?.include,
            exclude: [...compilerFiles, ...surfaceFiles],
            setupFiles: domSetup,
            sequence: {groupOrder: 3},
          },
        },
      ],
      coverage: packed
        ? {
            exclude: [
              "**/index.ts",
              "**/scripts/**",
              "**/useReducedMotion.tsx",
              "**/fireworks-background.tsx",
              "**/hole-background.tsx",
              "**/scratcher.tsx",
            ],
            thresholds: {branches: 80, functions: 95, lines: 95, statements: 95},
          }
        : {
            include: ["src/**/*.{js,jsx,ts,tsx}"],
            exclude: [
              "**/node_modules/**",
              "**/{generated,__generated__}/**",
              "**/*.generated.{ts,tsx,js,jsx}",
              "**/*.d.ts",
              "**/*.{test,spec,stories,config,setup}.{ts,tsx,js,jsx}",
              "**/__mocks__/**",
              // Export-only entry points and static motion tokens.
              "src/components/ui/direction.tsx",
              "src/hooks/useReducedMotion.tsx",
              "src/index.ts",
              "src/lib/calendar-locales.ts",
              "src/motion/index.ts",
              "src/motion/tokens.ts",
            ],
            thresholds: {branches: 95, functions: 95, lines: 95, statements: 95},
          },
    },
    resolve: {
      alias: {
        "@": resolve(import.meta.dirname, "./src"),
      },
    },
  }),
);
