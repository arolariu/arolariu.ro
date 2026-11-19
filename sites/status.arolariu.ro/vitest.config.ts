import {svelte} from "@sveltejs/vite-plugin-svelte";
import path from "node:path";
import {defineConfig} from "vitest/config";
import baseConfig from "../../vitest.config.ts";
import {statusCoverageScope} from "./tests/unit-coverage/scope.ts";

const logicTests = [
  "src/lib/aggregation/**/*.test.{ts,js}",
  "src/lib/{api/mockData,types/guards}.test.ts",
  "src/lib/stores/themeStore.ssr.test.ts",
  "{scripts,tests/unit-coverage}/**/*.test.{ts,js}",
];

export default defineConfig({
  plugins: [svelte({compilerOptions: {dev: true}})],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      $lib: path.resolve(import.meta.dirname, "src", "lib"),
      "$app/environment": path.resolve(import.meta.dirname, "src", "__mocks__", "$app", "environment.ts"),
      "$app/state": path.resolve(import.meta.dirname, "src", "__mocks__", "$app", "state.ts"),
    },
    conditions: ["browser"],
  },
  test: {
    ...baseConfig.test,
    include: [],
    setupFiles: [],
    exclude: [...(baseConfig.test?.exclude ?? []), "**/tests/e2e/**", "**/build/**", "**/.svelte-kit/**"],
    projects: [
      {extends: true, test: {name: "status-logic", include: logicTests, environment: "node"}},
      {
        extends: true,
        test: {
          name: "status-app",
          include: ["src/**/*.test.{ts,js}"],
          exclude: logicTests,
          environment: "jsdom",
          setupFiles: ["./vitest.setup.ts"],
        },
      },
    ],
    coverage: {
      ...baseConfig.test?.coverage,
      ...statusCoverageScope,
      thresholds: {lines: 99, functions: 99, statements: 99, branches: 90},
    },
  },
});
