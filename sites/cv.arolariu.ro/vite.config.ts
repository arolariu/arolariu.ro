/**
 * @fileoverview Vite configuration for the cv.arolariu.ro SvelteKit app.
 *
 * The SvelteKit Vite plugin is wired here; adapter and alias config
 * lives in `svelte.config.js`. Two production-only tweaks:
 *
 * - `esbuild.pure` marks diagnostic console calls (`log`, `debug`,
 *   `info`) as side-effect-free so esbuild's tree-shaker drops them
 *   from the production bundle. `console.error` and `console.warn`
 *   are intentionally retained as legitimate production diagnostics
 *   (`lib/utils/copy.ts` and `lib/utils/download.ts` use them for
 *   irrecoverable browser-API failures).
 *
 * - `build.target = "es2022"` lets esbuild emit modern ECMAScript
 *   features (top-level await, class fields, `Error.cause`) instead
 *   of down-leveling. Every browser the site supports (Chrome 94+,
 *   Firefox 93+, Safari 16+, Edge 94+) handles ES2022 natively.
 *
 * @see https://vitejs.dev/config/
 */

import {sveltekit} from "@sveltejs/kit/vite";
import {defineConfig} from "vite";

export default defineConfig({
  plugins: [sveltekit()],
  esbuild: {
    pure: ["console.log", "console.debug", "console.info"],
  },
  build: {
    target: "es2022",
  },
});
