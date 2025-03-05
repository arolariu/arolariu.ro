import { baseConfig } from "./vite.config.base";
import { defineConfig } from "vite";

export default defineConfig({
  ...baseConfig,
  build: {
    ...baseConfig.build,
    lib: {
      ...baseConfig.build?.lib,
      entry: "./src/index.ts",
      formats: ["umd"],
      fileName: () => "index.umd.js",
    },
    rollupOptions: {
      ...baseConfig.build?.rollupOptions,
      output: {
        ...baseConfig.build?.rollupOptions?.output,
        preserveModules: false,
      },
    },
    outDir: "./dist/umd",
    emptyOutDir: false,
  },
});
