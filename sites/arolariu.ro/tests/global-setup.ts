/**
 * @fileoverview Playwright global setup: writes the EULA-accepted cookie to
 * the shared storage state used by all tests. With the production-build
 * web server (see tests/config/index.ts), per-route warmup is no longer
 * necessary — pages are compiled at build time, not on first request.
 * @module playwright-global-setup
 */

import {chromium, type FullConfig} from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";

import {isProdBuild} from "./config/environment";

/** Storage state file path for sharing auth state across tests */
export const STORAGE_STATE_PATH = path.join(process.cwd(), "tests", "e2e-storage-state.json");

/**
 * Writes the EULA-accepted cookie so tests bypass the consent dialog.
 * Runs once before the suite, in a single short-lived browser context.
 *
 * The cookie's `secure` flag tracks the test server's scheme: prod build
 * runs over HTTP (cookie must be non-secure to apply), dev runs over HTTPS
 * via `next dev --experimental-https` (cookie can stay secure).
 */
export default async function globalSetup(_config: FullConfig): Promise<void> {
  const browser = await chromium.launch();
  const context = await browser.newContext({ignoreHTTPSErrors: true});

  await context.addCookies([
    {
      name: "eula-accepted",
      value: "true",
      domain: "localhost",
      path: "/",
      httpOnly: false,
      secure: !isProdBuild(),
      sameSite: "Lax",
    },
  ]);

  const authDir = path.dirname(STORAGE_STATE_PATH);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, {recursive: true});
  }
  await context.storageState({path: STORAGE_STATE_PATH});

  await context.close();
  await browser.close();
}
