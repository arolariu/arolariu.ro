import {dirname, resolve} from "node:path";
import {fileURLToPath} from "node:url";

import type {AliasOptions} from "vite";

const storybookDirectory = dirname(fileURLToPath(import.meta.url));

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
 * Storybook-only Vite aliases for app-wide dependencies that cannot execute in
 * the Storybook browser environment.
 *
 * @returns Alias entries consumed by Storybook's Vite builder.
 */
export function getCoreStorybookViteAliases(): AliasOptions {
  return [
    {
      find: /^@clerk\/nextjs$/,
      replacement: toVitePath(resolve(storybookDirectory, "mocks", "clerkNextjs.tsx")),
    },
    {
      find: /^next\/image$/,
      replacement: toVitePath(resolve(storybookDirectory, "mocks", "nextImage.tsx")),
    },
    {
      find: /^@\/lib\/actions\/cookies$/,
      replacement: toVitePath(resolve(storybookDirectory, "mocks", "cookies.tsx")),
    },
  ];
}
