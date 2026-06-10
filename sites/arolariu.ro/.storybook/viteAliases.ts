import {dirname, resolve} from "node:path";
import {fileURLToPath} from "node:url";

import type {AliasOptions} from "vite";

const storybookDirectory = dirname(fileURLToPath(import.meta.url));
const websiteRoot = resolve(storybookDirectory, "..");
const invoiceDomainRoot = resolve(websiteRoot, "src", "app", "domains", "invoices");
const invoiceStorybookRoot = resolve(invoiceDomainRoot, "_storybook");

/**
 * Converts Windows backslash paths to forward-slash paths for Vite.
 *
 * @param path - Path from Node's resolve()
 * @returns Forward-slash path for Vite
 */
function toVitePath(path: string): string {
  return path.replaceAll("\\", "/");
}

/**
 * Storybook-only Vite aliases for dependencies that cannot execute in Storybook.
 *
 * @remarks
 * Maps invoice domain server actions and hooks to browser-safe mocks.
 * Only uses exact path aliases (not regex) to avoid path concatenation issues.
 *
 * @returns Alias entries consumed by Storybook's Vite builder.
 */
export function getStorybookViteAliases(): AliasOptions {
  return [
    // App-wide browser-only Storybook mocks.
    {
      find: /^@clerk\/nextjs$/,
      replacement: toVitePath(resolve(storybookDirectory, "mocks", "clerkNextjs.tsx")),
    },
    {
      find: /^next\/image$/,
      replacement: toVitePath(resolve(storybookDirectory, "mocks", "nextImage.tsx")),
    },
    {
      find: /^@\/hooks$/,
      replacement: toVitePath(resolve(invoiceStorybookRoot, "mocks", "appHooks.ts")),
    },
    {
      find: /^@\/hooks\/useUserInformation$/,
      replacement: toVitePath(resolve(invoiceStorybookRoot, "mocks", "appHooks.ts")),
    },
    // Exact path aliases for absolute imports
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
