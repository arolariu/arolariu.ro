/**
 * @fileoverview Vitest mock for SvelteKit's `$app/navigation` virtual module.
 *
 * All navigation APIs are no-ops in tests - they exist purely to satisfy
 * imports inside components that render under `@testing-library/svelte`.
 * Wired via the `$app/navigation` alias in `vitest.config.ts`.
 *
 * @see https://kit.svelte.dev/docs/modules#$app-navigation
 */

function consume(...values: readonly unknown[]): void {
  values.includes(undefined);
}

export function goto(url: string | URL, options?: unknown): Promise<void> {
  consume(url, options);
  return Promise.resolve();
}

export function invalidate(resource?: unknown): Promise<void> {
  consume(resource);
  return Promise.resolve();
}

export function invalidateAll(): Promise<void> {
  return Promise.resolve();
}

export function preloadCode(...urls: string[]): Promise<void> {
  consume(urls);
  return Promise.resolve();
}

export function preloadData(href: string): Promise<unknown> {
  consume(href);
  return Promise.resolve({type: "loaded", status: 200, data: {}});
}

export function beforeNavigate(callback: unknown): void {
  consume(callback);
}

export function afterNavigate(callback: unknown): void {
  consume(callback);
}

export function onNavigate(callback: unknown): void {
  consume(callback);
}

export function pushState(url: string | URL, state: unknown): void {
  consume(url, state);
}

export function replaceState(url: string | URL, state: unknown): void {
  consume(url, state);
}

export function disableScrollHandling(): void {
  consume();
}
