/**
 * @fileoverview Root layout module for the CV site.
 *
 * @remarks
 * Declares the SvelteKit page options inherited by every nested route:
 *
 *  - `prerender = true` — All routes are statically generated at build
 *    time. The CV's data lives in `src/data/*.ts` and is fully known
 *    when `vite build` runs, so there is no need for runtime SSR.
 *
 *  - `ssr = true` — Pages render to HTML during the build (required
 *    for prerendering). At runtime this is a no-op; the user receives
 *    pre-baked HTML.
 *
 *  - `csr = true` — After hydration, the page becomes a full SPA
 *    (View Transitions, Command Palette, scroll progress, etc.).
 *
 *  - `trailingSlash = "never"` — Canonical URLs without a trailing
 *    slash (`/human`, not `/human/`), keeping social previews tidy.
 *
 * @see https://svelte.dev/docs/kit/page-options
 */

export const prerender = true;
export const ssr = true;
export const csr = true;
export const trailingSlash = "never";
