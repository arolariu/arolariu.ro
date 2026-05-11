/**
 * @fileoverview Vitest mock for SvelteKit's `$app/state` virtual module.
 *
 * Returns inert state objects so components that read `page`, `navigating`,
 * or `updated` state objects can render in tests without a SvelteKit runtime.
 * Wired via the `$app/state` alias in `vitest.config.ts`.
 *
 * @see https://kit.svelte.dev/docs/modules#$app-state
 */

interface MockPage {
  url: URL;
  params: Record<string, string>;
  route: {id: string | null};
  status: number;
  error: {message: string} | null;
  data: Record<string, unknown>;
  state: Record<string, unknown>;
  form: unknown;
}

export const page: MockPage = {
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
  willUnload: null,
  delta: null,
  complete: null,
};

export const updated = {
  current: false,
  check: async (): Promise<boolean> => false,
};
