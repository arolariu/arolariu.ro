import { defineConfig } from "@rslib/core";
import { pluginReact } from "@rsbuild/plugin-react";
import path from "node:path";

export default defineConfig({
  source: {
    entry: {
      index: ["./src/**"],
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
          root: "./dist/esm",
        },
        filename: {
          js: "[name].js",
          css: "[name].css",
        },
      },
    },
    {
      bundle: false,
      dts: true,
      format: "cjs",
      output: {
        distPath: {
          root: "./dist/cjs",
        },
        filename: {
          js: "[name].cjs",
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
