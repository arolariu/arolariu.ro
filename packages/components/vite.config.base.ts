import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import dts from "vite-plugin-dts";
import path from "node:path";
import autoprefixer from "autoprefixer";
import tailwindcss from "tailwindcss";
import cssnano from "cssnano";
import muteWarningsPlugin from "./plugins/mute-rollup-warnings";
import preserveDirectives from "rollup-preserve-directives";
import { visualizer } from "rollup-plugin-visualizer";

const warningsToIgnore = [
  ["SOURCEMAP_ERROR", "Can't resolve original location of error"],
  ["INVALID_ANNOTATION", "contains an annotation that Rollup cannot interpret"],
];

export const baseConfig = defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  css: {
    postcss: {
      from: path.resolve(__dirname, "./src/index.css"),
      plugins: [
        tailwindcss({
          config: path.resolve(__dirname, "./tailwind.config.mjs"),
        }),
        autoprefixer(),
        cssnano({
          preset: [
            "default",
            {
              discardComments: { removeAll: true },
              normalizeWhitespace: true,
            },
          ],
        }),
      ],
    },
  },
  plugins: [
    react({ tsDecorators: true }),
    dts({
      entryRoot: "src",
      rollupTypes: true,
      insertTypesEntry: true,
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["**/*.{test,stories}.{ts,tsx}", "node_modules/**"],
      outDir: "./dist/types",
      tsconfigPath: path.resolve(__dirname, "./tsconfig.json"),
      copyDtsFiles: true,
      staticImport: true,
    }),
    muteWarningsPlugin(warningsToIgnore),
    preserveDirectives() as Plugin,
    visualizer(),
  ],
  build: {
    outDir: "./dist",
    target: "es2020",
    copyPublicDir: false,
    cssCodeSplit: false,
    sourcemap: true,
    minify: true,
    cssMinify: true,
    lib: {
      name: "@arolariu/components",
      entry: path.resolve(__dirname, "./src/index.ts"),
      fileName(format, entryName) {
        const extension = format === "cjs" ? "cjs" : "js";
        return `${entryName}.${extension}`;
      },
      cssFileName: "index",
    },
    rollupOptions: {
      treeshake: true,
      input: "./src/index.ts",
      preserveEntrySignatures: "strict",
      external: ["react", "react-dom", "react/jsx-runtime"],
      output: {
        exports: "named",
        preserveModules: true,
        preserveModulesRoot: "src",
        banner: `'use client';`,
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
          "react/jsx-runtime": "react/jsx-runtime",
        },
        assetFileNames: (assetInfo) => {
          return assetInfo.name === "index.css" ? "index.css" : assetInfo.name!;
        },
      },
    },
  },
});
