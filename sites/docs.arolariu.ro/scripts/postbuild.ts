/**
 * @fileoverview Post-build hook for the Docusaurus docs site.
 *
 * @remarks
 * Fires automatically after `npm run build` via the npm `postbuild`
 * lifecycle. Performs two deploy-time tasks that Docusaurus itself
 * doesn't know about:
 *
 *   1. Copies `staticwebapp.config.json` into the `build/` output so
 *      Azure Static Web Apps picks up the rewrite rules, MIME map,
 *      and security headers.
 *   2. Generates `build/llms.txt` — a short, curated index of the
 *      built site in a format crawlable by LLM-based agents.
 *
 * Not invoked by `npx docusaurus build` directly — only by
 * `npm run build` (or Nx targets that chain through npm).
 */

import {copyFileSync, existsSync, mkdirSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {generate as generateLlmsTxt} from './generate-llms-txt.ts';

/** Absolute path to the docs-site root (the sibling of `build/`). */
const ROOT = resolve(import.meta.dirname, '..');
/** Absolute path to the Docusaurus build output. */
const BUILD = resolve(ROOT, 'build');

/**
 * Copy the source-controlled `staticwebapp.config.json` into the
 * deploy artifact so Azure Static Web Apps picks it up on upload.
 * Warns (instead of throwing) when the source file is missing — a
 * local dev build may not care about it.
 */
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

/**
 * Top-level postbuild entry point. Runs the SWA-config copy step
 * followed by the llms.txt generator. Any error exits the process
 * with a non-zero status so CI fails the deploy.
 */
async function main(): Promise<void> {
  copyStaticWebAppsConfig();
  generateLlmsTxt();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
