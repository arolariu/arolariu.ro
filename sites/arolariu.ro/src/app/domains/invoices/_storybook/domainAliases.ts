import {dirname, resolve} from "node:path";
import {fileURLToPath} from "node:url";

import type {AliasOptions, PluginOption} from "vite";

const invoiceStorybookRoot = dirname(fileURLToPath(import.meta.url));
const invoiceDomainRoot = resolve(invoiceStorybookRoot, "..");

/**
 * Converts Windows backslash paths to Vite-compatible forward-slash paths.
 *
 * @param path - Native filesystem path.
 * @returns Vite-compatible path.
 */
export function toVitePath(path: string): string {
  return path.replaceAll("\\", "/");
}

/**
 * Returns invoice-domain Storybook aliases for absolute imports.
 *
 * @returns Alias entries consumed by Storybook's Vite builder.
 */
export function getInvoiceStorybookAliases(): AliasOptions {
  return [
    {
      find: /^@\/hooks$/,
      replacement: toVitePath(resolve(invoiceStorybookRoot, "mocks", "appHooks.ts")),
    },
    {
      find: /^@\/hooks\/useUserInformation$/,
      replacement: toVitePath(resolve(invoiceStorybookRoot, "mocks", "appHooks.ts")),
    },
    {
      find: toVitePath(resolve(invoiceDomainRoot, "_actions", "invoices")),
      replacement: toVitePath(resolve(invoiceStorybookRoot, "mocks", "actions", "invoices.ts")),
    },
    {
      find: toVitePath(resolve(invoiceDomainRoot, "_actions", "scans")),
      replacement: toVitePath(resolve(invoiceStorybookRoot, "mocks", "actions", "scans.ts")),
    },
    {
      find: toVitePath(resolve(invoiceDomainRoot, "_actions", "merchants")),
      replacement: toVitePath(resolve(invoiceStorybookRoot, "mocks", "actions", "merchants.ts")),
    },
    {
      find: toVitePath(resolve(invoiceDomainRoot, "_hooks", "invoice")),
      replacement: toVitePath(resolve(invoiceStorybookRoot, "mocks", "hooks", "invoice.tsx")),
    },
    {
      find: toVitePath(resolve(invoiceDomainRoot, "_hooks", "scan")),
      replacement: toVitePath(resolve(invoiceStorybookRoot, "mocks", "hooks", "scan.tsx")),
    },
  ];
}

/**
 * Returns invoice-domain resolver plugins for relative imports that cannot be
 * represented as exact aliases.
 *
 * @returns Vite plugins consumed by Storybook's Vite builder.
 */
export function getInvoiceStorybookResolverPlugins(): PluginOption[] {
  return [
    {
      name: "invoice-storybook-mock-resolver",
      enforce: "pre",
      resolveId(id) {
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
  ];
}
