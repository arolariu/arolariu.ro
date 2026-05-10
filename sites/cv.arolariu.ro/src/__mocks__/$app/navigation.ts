/**
 * @fileoverview Vitest mock for SvelteKit's `$app/navigation` virtual module.
 *
 * All navigation APIs are no-ops in tests — they exist purely to satisfy
 * imports inside components that render under `@testing-library/svelte`.
 * Wired via the `$app/navigation` alias in `vitest.config.ts`.
 *
 * @see https://kit.svelte.dev/docs/modules#$app-navigation
 */

export const goto = async (_url: string | URL, _opts?: unknown): Promise<void> => {};
export const invalidate = async (_resource?: string | URL | ((url: URL) => boolean)): Promise<void> => {};
export const invalidateAll = async (): Promise<void> => {};
export const preloadCode = async (..._urls: string[]): Promise<void> => {};
export const preloadData = async (_href: string): Promise<unknown> => ({type: "loaded", status: 200, data: {}});
export const beforeNavigate = (_callback: (..._args: unknown[]) => unknown): void => {};
export const afterNavigate = (_callback: (..._args: unknown[]) => unknown): void => {};
export const onNavigate = (_callback: (..._args: unknown[]) => unknown): void => {};
export const pushState = (_url: string | URL, _state: unknown): void => {};
export const replaceState = (_url: string | URL, _state: unknown): void => {};
export const disableScrollHandling = (): void => {};
