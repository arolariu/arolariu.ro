/**
 * @fileoverview Vitest mock for SvelteKit's `$app/state` virtual module.
 *
 * Returns inert state objects so components that read `page`, `navigating`,
 * or `updated` runes can render in tests without a SvelteKit runtime.
 * Wired via the `$app/state` alias in `vitest.config.ts`.
 *
 * @see https://kit.svelte.dev/docs/modules#$app-state
 */

export const page = {
  url: new URL("https://cv.arolariu.ro/"),
  params: {},
  route: {id: "/"},
  status: 200,
  error: null,
  data: {},
  state: {},
  form: null,
};

export const navigating = {
  from: null,
  to: null,
  type: null,
  willUnload: false,
  delta: 0,
  complete: Promise.resolve(),
};

export const updated = {current: false, check: async (): Promise<boolean> => false};
