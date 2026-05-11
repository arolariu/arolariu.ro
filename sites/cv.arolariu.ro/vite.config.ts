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
 * - `build.target = "esnext"` lets esbuild emit any modern ECMAScript
 *   syntax without down-leveling. The codebase doesn't use features
 *   beyond ES2022 today, so output is currently identical to
 *   `target: "es2022"` — but the directive future-proofs the build
 *   so adopting ES2023+ syntax later doesn't require revisiting this
 *   config. All browsers the site targets (Chrome 94+, Firefox 93+,
 *   Safari 16+, Edge 94+) handle ES2022 natively; if a future
 *   contributor lands a dependency that uses syntax esbuild can't
 *   parse, the build fails fast — explicit beats silent down-leveling.
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
    target: "esnext",
  },
});
