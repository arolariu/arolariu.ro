import {copyFileSync, existsSync, mkdirSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {generate as generateLlmsTxt} from './generate-llms-txt.ts';

const ROOT = resolve(import.meta.dirname, '..');
const BUILD = resolve(ROOT, 'build');

function copyStaticWebAppsConfig(): void {
  const src = resolve(ROOT, 'staticwebapp.config.json');
  const dest = resolve(BUILD, 'staticwebapp.config.json');
  if (!existsSync(src)) {
    console.warn('[postbuild] staticwebapp.config.json not found at', src);
    return;
  }
  mkdirSync(dirname(dest), {recursive: true});
  copyFileSync(src, dest);
  console.log('[postbuild] copied staticwebapp.config.json -> build/');
}

async function main(): Promise<void> {
  copyStaticWebAppsConfig();
  generateLlmsTxt();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
