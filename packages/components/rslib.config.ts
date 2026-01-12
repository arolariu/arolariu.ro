/**
 * @fileoverview RSLib/Rsbuild configuration for the shared components package.
 * @module packages/components/rslib.config
 *
 * @remarks
 * Configures bundling output (ESM), declarations, source maps, and the `@` path alias.
 */

import {pluginReact} from "@rsbuild/plugin-react";
import {defineConfig} from "@rslib/core";
import path from "node:path";
const bundlerConfig = defineConfig({
  source: {
    entry: {
      index: ["./src/**", "!./src/**/*.test.*"],
    },
    tsconfigPath: path.resolve(__dirname, "./tsconfig.json"),
  },
  lib: [
    {
      bundle: false,
      dts: true,
      format: "esm",
      output: {
        distPath: {
          root: "./dist/",
        },
        filename: {
          js: "[name].js",
          css: "[name].css",
        },
      },
    },
  ],
  output: {
    target: "web",
    sourceMap: {
      js: "source-map",
      css: true,
    },
  },
  plugins: [pluginReact()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});

export default bundlerConfig;
