import type {AliasOptions, PluginOption} from "vite";

import {
  getInvoiceStorybookAliases,
  getInvoiceStorybookResolverPlugins,
} from "../src/app/domains/invoices/_storybook/domainAliases.js";
import {getCoreStorybookViteAliases} from "./viteAliases.js";

/**
 * Gets all Storybook Vite aliases, composed from the core layer and
 * domain-owned Storybook layers.
 *
 * @returns Alias entries consumed by Storybook's Vite builder.
 */
export function getStorybookViteAliases(): AliasOptions {
  return [
    ...getCoreStorybookViteAliases(),
    ...getInvoiceStorybookAliases(),
  ];
}

/**
 * Gets resolver plugins owned by domain Storybook layers.
 *
 * @returns Vite resolver plugins consumed by Storybook's Vite builder.
 */
export function getStorybookResolverPlugins(): PluginOption[] {
  return [...getInvoiceStorybookResolverPlugins()];
}
