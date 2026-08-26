import type {StorybookConfig} from "@storybook/nextjs-vite";
import {resolve} from "node:path";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-a11y", "@storybook/addon-docs", "@storybook/addon-themes"],
  framework: {
    name: "@storybook/nextjs-vite",
    options: {},
  },
  staticDirs: ["../public"],
  docs: {
    docsMode: false,
  },
  features: {
    experimentalRSC: true,
  },
  // Aliases below MUST be exact-specifier matches so they take priority over the
  // general `@/*` tsconfig-paths mapping (resolved by `vite-tsconfig-paths` inside
  // the `@storybook/nextjs-vite` framework preset). These aliases isolate
  // external server/runtime boundaries while leaving application components
  // and their state providers intact.
  async viteFinal(viteConfig) {
    const inheritedAliases = Array.isArray(viteConfig.resolve?.alias)
      ? viteConfig.resolve.alias
      : Object.entries(viteConfig.resolve?.alias ?? {}).map(([find, replacement]) => ({find, replacement}));

    return {
      ...viteConfig,
      resolve: {
        ...viteConfig.resolve,
        alias: [
          // `server-only` throws when imported outside a `react-server` condition,
          // which Storybook's browser bundle never sets.
          {find: /^server-only$/, replacement: resolve(import.meta.dirname, "./mocks/server-only.ts")},
          // `@/instrumentation.server` imports Node-only OpenTelemetry/Azure SDKs.
          // Client Components that transitively import a `"use server"` action
          // (e.g. ClassificationPicker -> searchClassifications) would otherwise
          // bundle that Node SDK graph into the browser, crashing with
          // `ReferenceError: __dirname is not defined`.
          {
            find: /^@\/instrumentation\.server$/,
            replacement: resolve(import.meta.dirname, "./mocks/instrumentation.server.ts"),
          },
          // Relative imports of the scan-action barrel are not transformed
          // into Next.js RPC references by Storybook. Keep seeded scan stories
          // deterministic instead of contacting local auth/config/storage
          // services and replacing their fixtures after hydration.
          {
            find: /^(?:@\/app\/domains\/invoices\/_actions\/scans|\.\.\/\.\.\/_actions\/scans)$/,
            replacement: resolve(import.meta.dirname, "./mocks/scans-actions.ts"),
          },
          // Azure's browser bundle intentionally omits server-side SAS helpers.
          // Stories never contact Blob Storage, so expose a deterministic
          // browser implementation for transitive scan-action imports.
          {find: /^@azure\/storage-blob$/, replacement: resolve(import.meta.dirname, "./mocks/azure-storage-blob.ts")},
          // Authentication is an external boundary. The preview uses a stable
          // signed-out identity instead of contacting Clerk from Storybook.
          {find: /^@clerk\/nextjs$/, replacement: resolve(import.meta.dirname, "./mocks/clerk-nextjs.tsx")},
          {find: /^@clerk\/nextjs\/server$/, replacement: resolve(import.meta.dirname, "./mocks/clerk-nextjs.tsx")},
          // next-themes injects a document-level script that React cannot mount
          // inside Storybook's preview root. Keep its public hook/provider
          // behavior without emitting document bootstrap markup.
          {find: /^next-themes$/, replacement: resolve(import.meta.dirname, "./mocks/next-themes.tsx")},
          ...inheritedAliases,
        ],
      },
    };
  },
};

export default config;
