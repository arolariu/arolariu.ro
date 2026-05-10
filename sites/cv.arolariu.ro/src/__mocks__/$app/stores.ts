/**
 * Mock for SvelteKit's $app/stores module
 * Provides minimal readable stores used by view components in tests.
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
