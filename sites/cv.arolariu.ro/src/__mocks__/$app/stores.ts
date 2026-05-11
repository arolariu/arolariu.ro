/**
 * @fileoverview Vitest mock for SvelteKit's `$app/stores` virtual module.
 *
 * Returns inert readable stores so components that subscribe to `page`
 * or `navigating` can render in tests without a SvelteKit runtime.
 * Wired via the `$app/stores` alias in `vitest.config.ts`.
 *
 * @see https://kit.svelte.dev/docs/modules#$app-stores
 */

import {readable} from "svelte/store";

export const page = readable({
  url: new URL("https://cv.arolariu.ro/"),
  params: {},
  route: {id: "/"},
  status: 200,
  error: null,
  data: {},
  state: {},
  form: null,
});

export const navigating = readable(null);
export const updated = readable(false);

export function getStores(): {page: typeof page; navigating: typeof navigating; updated: typeof updated} {
  return {page, navigating, updated};
}
