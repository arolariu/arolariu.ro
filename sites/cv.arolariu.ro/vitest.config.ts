/**
 * @fileoverview Vitest configuration for cv.arolariu.ro (SvelteKit).
 * @module sites/cv.arolariu.ro/vitest.config
 *
 * @remarks
 * Extends the monorepo base Vitest configuration and adapts it for Svelte testing.
 *
 * @see https://vitest.dev/config/
 */

import {svelte} from "@sveltejs/vite-plugin-svelte";
import path from "node:path";
import {defineConfig, mergeConfig} from "vitest/config";
import baseConfig from "../../vitest.config";

export default mergeConfig(
  baseConfig,
  defineConfig({
    plugins: [
      svelte({
        compilerOptions: {
          // Enable runtime checks in tests
          dev: true,
        },
      }),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        $lib: path.resolve(__dirname, "./src/lib"),
        "$app/environment": path.resolve(__dirname, "./src/__mocks__/$app/environment.ts"),
      },
      conditions: ["browser"],
    },
    test: {
      setupFiles: ["./vitest.setup.ts"],
      include: ["src/**/*.test.{ts,js}"],
      exclude: ["**/node_modules/**", "**/dist/**", "**/build/**", "**/.svelte-kit/**", "**/coverage/**"],
      coverage: {
        include: ["src/**/*.{ts,js,svelte}"],
        exclude: [
          // Static data that doesn't require testing
          "**/src/data/author.ts",
          "**/src/data/biography.ts",
          "**/src/data/certifications.ts",
          "**/src/data/competencies.ts",
          "**/src/data/education.ts",
          "**/src/data/experiences.ts",
          "**/src/data/landing.ts",
          "**/src/data/skills.ts",
          "**/src/data/technical.ts",
          "**/src/data/testimonials.ts",
          "**/src/data/volunteering.ts",
          "**/src/data/json.ts",
          "**/src/data/viewdata.ts",
          "**/src/data/index.ts",

          // Re-export index files (no logic to test)
          "**/src/lib/utils/index.ts",
          "**/src/components/motion/index.ts",

          // Mock files
          "**/src/__mocks__/**",

          // UI Components (will be tested via E2E)
          "**/src/routes/**/*.svelte",
          "**/src/lib/views/**/*.svelte",
          "**/src/presentation/**/*.svelte",
          "**/src/components/**/*.svelte",

          // App files
          "**/src/app.html",
          "**/src/app.css",
          "**/src/service-worker.ts",
        ],
      },
    },
  }),
);
