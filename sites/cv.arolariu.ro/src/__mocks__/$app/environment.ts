/**
 * Mock for SvelteKit's $app/environment module
 * Used in tests to simulate browser environment
 *
 * @see https://kit.svelte.dev/docs/modules#$app-environment
 */

export const browser = true;
export const building = false;
/* eslint-disable-next-line unicorn/prevent-abbreviations -- false positive */
export const dev = true;
export const version = "test";
