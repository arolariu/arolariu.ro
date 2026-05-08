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

/** Storage state file path for sharing auth state across tests */
export const STORAGE_STATE_PATH = path.join(process.cwd(), "tests", "e2e-storage-state.json");

/**
 * Writes the EULA-accepted cookie so tests bypass the consent dialog.
 * Runs once before the suite, in a single short-lived browser context.
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
      secure: true,
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
