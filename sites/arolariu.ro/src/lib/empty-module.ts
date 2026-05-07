/**
 * @fileoverview Browser-side stub for Node.js builtins.
 * @module lib/empty-module
 *
 * @remarks
 * Some npm packages (notably @xenova/transformers v2) statically import
 * `fs`, `path`, `url` at the top of their entry module to detect whether
 * they are running on Node. Turbopack's worker bundler does not honor
 * the package's `browser: { fs: false, ... }` field, so those imports
 * resolve to `undefined` and `Object.keys(undefined)` throws inside the
 * package's environment-detection code.
 *
 * This stub provides an empty default export plus common named exports
 * so the static-import shape is preserved without crashing module
 * evaluation. Aliased via `turbopack.resolveAlias` in `next.config.ts`.
 *
 * SECURITY: zero side effects, no globals touched.
 */

const empty = {};

export default empty;
export const promises = empty;
export const constants = empty;
export const sep = "/";
export const delimiter = ":";
export const join = (...parts: string[]): string => parts.join("/");
export const resolve = (...parts: string[]): string => parts.join("/");
export const dirname = (p: string): string => p;
export const basename = (p: string): string => p;
export const extname = (p: string): string => "";
export const URL = globalThis.URL;
export const fileURLToPath = (u: string | URL): string => String(u);
export const pathToFileURL = (p: string): URL => new globalThis.URL(`file://${p}`);
