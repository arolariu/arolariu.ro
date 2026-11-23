import {vitePreprocess} from "@sveltejs/vite-plugin-svelte";
import adapter from "@sveltejs/adapter-static";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),

  kit: {
    adapter: adapter({pages: "build/static", assets: "build/static", strict: true}),
    alias: {
      "@/*": "src/*",
    },
  },
};

export default config;
