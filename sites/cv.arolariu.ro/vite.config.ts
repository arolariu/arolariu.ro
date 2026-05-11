/**
 * @fileoverview Vite configuration for the cv.arolariu.ro SvelteKit app.
 *
 * Only the SvelteKit Vite plugin is wired here; everything else is
 * driven by `svelte.config.js` (adapter, alias) and the SvelteKit
 * conventions.
 *
 * @see https://vitejs.dev/config/
 */

import {sveltekit} from "@sveltejs/kit/vite";
import {defineConfig} from "vite";

export default defineConfig({
  plugins: [sveltekit()],
});
