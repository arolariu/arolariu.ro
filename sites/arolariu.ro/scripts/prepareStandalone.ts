/**
 * @fileoverview Copy static assets into the standalone bundle for E2E test serving.
 * @module sites/arolariu.ro/scripts/prepareStandalone
 *
 * @remarks
 * `next build` with `output: "standalone"` produces `.next/standalone/sites/arolariu.ro/server.js`
 * but does NOT copy `.next/static/` or `public/` into the standalone directory. The standalone
 * server expects them co-located. Docker COPYs them at image-build time; for E2E tests we copy
 * them here before starting the server.
 *
 * Cross-platform via Node's `fs.cpSync` (available since Node 16).
 */

import fs from "node:fs";
import path from "node:path";

const STANDALONE_ROOT = path.join(".next", "standalone", "sites", "arolariu.ro");

function copyTree(src: string, dest: string): void {
  if (!fs.existsSync(src)) {
    console.log(`[prepareStandalone] Skipping ${src} (does not exist)`);
    return;
  }
  fs.cpSync(src, dest, {recursive: true, force: true});
  console.log(`[prepareStandalone] Copied ${src} -> ${dest}`);
}

copyTree("public", path.join(STANDALONE_ROOT, "public"));
copyTree(path.join(".next", "static"), path.join(STANDALONE_ROOT, ".next", "static"));
console.log("[prepareStandalone] Done.");
