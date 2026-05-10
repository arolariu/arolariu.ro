/**
 * @fileoverview Vitest mock for SvelteKit's `$app/environment` virtual module.
 *
 * Wired via the `$app/environment` alias in `vitest.config.ts` so component
 * tests can render without spinning up the SvelteKit runtime.
 *
 * @see https://kit.svelte.dev/docs/modules#$app-environment
 */

export const browser = true;
export const building = false;
/* eslint-disable-next-line unicorn/prevent-abbreviations -- false positive */
export const dev = true;
export const version = "test";
