import { defineConfig, mergeConfig } from "vite";
import { baseConfig } from "./vite.config.base";
import path from "node:path";

export default mergeConfig(
  baseConfig,
  defineConfig({
    build: {
      outDir: "./dist/cjs",
      lib: {
        entry: path.resolve(__dirname, "./src/index.ts"),
        formats: ["cjs"],
      },
      emptyOutDir: false,
    },
  })
);
