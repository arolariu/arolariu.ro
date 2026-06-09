import {dirname, resolve} from "node:path";
import {fileURLToPath} from "node:url";

import type {AliasOptions} from "vite";

const storybookDirectory = dirname(fileURLToPath(import.meta.url));
const websiteRoot = resolve(storybookDirectory, "..");
const invoiceDomainRoot = resolve(websiteRoot, "src", "app", "domains", "invoices");
const invoiceStorybookRoot = resolve(invoiceDomainRoot, "_storybook");

/**
 * Storybook-only Vite aliases for dependencies that cannot execute in Storybook.
 *
 * @returns Alias entries consumed by Storybook's Vite builder.
 */
export function getStorybookViteAliases(): AliasOptions {
  return [
    {
      find: resolve(invoiceDomainRoot, "_actions", "invoices"),
      replacement: resolve(invoiceStorybookRoot, "mocks", "actions", "invoices.ts"),
    },
    {
      find: resolve(invoiceDomainRoot, "_actions", "scans"),
      replacement: resolve(invoiceStorybookRoot, "mocks", "actions", "scans.ts"),
    },
    {
      find: resolve(invoiceDomainRoot, "_actions", "merchants"),
      replacement: resolve(invoiceStorybookRoot, "mocks", "actions", "merchants.ts"),
    },
    {
      find: resolve(invoiceDomainRoot, "_hooks", "invoice"),
      replacement: resolve(invoiceStorybookRoot, "mocks", "hooks", "invoice.tsx"),
    },
    {
      find: resolve(invoiceDomainRoot, "_hooks", "scan"),
      replacement: resolve(invoiceStorybookRoot, "mocks", "hooks", "scan.tsx"),
    },
  ];
}
