import {svelte} from "@sveltejs/vite-plugin-svelte";
import path from "node:path";
import {defineConfig, mergeConfig} from "vitest/config";
import baseConfig from "../../vitest.config";

export default mergeConfig(
  baseConfig,
  defineConfig({
    plugins: [
      svelte({
        compilerOptions: {dev: true},
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
      environment: "jsdom",
      setupFiles: ["./vitest.setup.ts"],
      include: ["src/**/*.test.{ts,js}", "scripts/**/*.test.{ts,js}"],
      exclude: ["**/node_modules/**", "**/tests/e2e/**", "**/build/**", "**/.svelte-kit/**"],
      coverage: {
        include: ["src/**/*.{ts,js,svelte}", "scripts/**/*.ts"],
        exclude: [
          "**/src/__mocks__/**",
          "**/src/app.html",
          "**/src/app.css",
          "**/src/routes/**/*.svelte",
          "**/*.test.{ts,js}",
        ],
      },
    },
  }),
);
