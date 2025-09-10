import {vitePreprocess} from "@sveltejs/vite-plugin-svelte";
import azure from "svelte-adapter-azure-swa";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),

  kit: {
    adapter: azure(),
    alias: {
      "@/*": "src/*",
    },
  },
};

export default config;
