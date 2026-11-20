import {vitePreprocess} from "@sveltejs/vite-plugin-svelte";
import adapter from "@sveltejs/adapter-static";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),

  kit: {
    adapter: adapter({pages: "build/static", assets: "build/static", strict: true}),
    serviceWorker: {
      files: (filename) => filename !== "staticwebapp.config.json" && !/\.DS_Store/.test(filename),
    },
    alias: {
      "@/*": "src/*",
    },
  },
};

export default config;
