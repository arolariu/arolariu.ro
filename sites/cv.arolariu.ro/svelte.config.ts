import azure from 'svelte-adapter-azure-swa';
import type { Config } from '@sveltejs/kit';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const config: Config = {
	preprocess: vitePreprocess(),

	kit: {
		adapter: azure(),
		alias: {
			'@/*': 'src/*'
		}
	}
};

export default config;
