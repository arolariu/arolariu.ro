import type {StorybookConfig} from "@storybook/nextjs-vite";
import {mergeConfig} from "vite";
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {dirname} from "node:path";
import {getStorybookViteAliases} from "./viteAliases";

const storybookDirectory = dirname(fileURLToPath(import.meta.url));
const websiteRoot = resolve(storybookDirectory, "..");
const invoiceDomainRoot = resolve(websiteRoot, "src", "app", "domains", "invoices");
const invoiceStorybookRoot = resolve(invoiceDomainRoot, "_storybook");

/**
 * Converts Windows backslash paths to forward-slash paths for Vite.
 */
function toVitePath(path: string): string {
  return path.replaceAll("\\", "/");
}

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-a11y", "@storybook/addon-themes"],
  framework: {
    name: "@storybook/nextjs-vite",
    options: {},
  },
  staticDirs: ["../public"],
  docs: {
    docsMode: true,
  },
  features: {
    experimentalRSC: true,
  },
  viteFinal: async (config) =>
    mergeConfig(config, {
      resolve: {
        alias: getStorybookViteAliases(),
      },
      plugins: [
        {
          name: "invoice-action-mock-resolver",
          enforce: "pre",
          resolveId(id) {
            // Catch relative imports ending with _actions/invoices, _actions/scans, etc.
            if (id.endsWith("/_actions/invoices")) {
              return toVitePath(resolve(invoiceStorybookRoot, "mocks", "actions", "invoices.ts"));
            }
            if (id.endsWith("/_actions/scans")) {
              return toVitePath(resolve(invoiceStorybookRoot, "mocks", "actions", "scans.ts"));
            }
            if (id.endsWith("/_actions/merchants")) {
              return toVitePath(resolve(invoiceStorybookRoot, "mocks", "actions", "merchants.ts"));
            }
            if (id.endsWith("/_hooks/invoice")) {
              return toVitePath(resolve(invoiceStorybookRoot, "mocks", "hooks", "invoice.tsx"));
            }
            if (id.endsWith("/_hooks/scan")) {
              return toVitePath(resolve(invoiceStorybookRoot, "mocks", "hooks", "scan.tsx"));
            }
            return null;
          },
        },
      ],
    }),
};

export default config;
