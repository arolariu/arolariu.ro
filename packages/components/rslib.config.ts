import { defineConfig } from "@rslib/core";
import { pluginReact } from "@rsbuild/plugin-react";
import path from "node:path";

/**
 * Bundler configuration for building the component library.
 *
 * Configures the build process to output both ESM and CommonJS formats
 * with separate distribution directories for each module system.
 *
 * @remarks
 * - Generates TypeScript declaration files (.d.ts) for both formats
 * - Outputs source maps for JavaScript and CSS files
 * - Uses React plugin for JSX transformation
 * - Sets up path alias '@' pointing to the src directory
 * - Targets web platform for the build output
 *
 * @example
 * ```typescript
 * // The configuration produces:
 * // - ESM modules in ./dist/esm/
 * // - CommonJS modules in ./dist/cjs/
 * ```
 */
const bundlerConfig = defineConfig({
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

export default bundlerConfig;
