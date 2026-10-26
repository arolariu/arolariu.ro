/**
 * @fileoverview Browser-safe stub for the `server-only` package in Storybook.
 * @module .storybook/mocks/server-only
 *
 * @remarks
 * The real `server-only` package throws when imported outside of a
 * `react-server` condition (see `node_modules/server-only/index.js`), which is
 * exactly what happens here: Storybook's `@storybook/nextjs-vite` framework
 * bundles stories for the browser and does not set the `react-server`
 * resolution condition, nor does it strip `"use server"` action modules the
 * way the real Next.js compiler does. Aliased in `.storybook/main.ts`
 * (`viteFinal`) so any component that transitively imports a `"use server"`
 * module can still be rendered as a story without crashing on this
 * build-time-only marker.
 *
 * Mirrors the equivalent Vitest stub at `tests/stubs/server-only.ts`.
 */

// Empty stub — does nothing.
export {};
