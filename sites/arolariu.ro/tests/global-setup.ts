/**
 * @fileoverview Playwright global setup for pre-warming critical routes.
 * This runs once before all tests to trigger Next.js on-demand page compilation.
 * @module playwright-global-setup
 */

import {chromium, type FullConfig} from "@playwright/test";

/**
 * Critical routes that need to be pre-warmed before tests run.
 * These are pages that are commonly tested and slow to compile on first load.
 */
const CRITICAL_ROUTES = ["/", "/about", "/about/the-author", "/about/the-platform", "/domains", "/domains/invoices", "/auth", "/auth/sign-in", "/auth/sign-up"];

/**
 * Global setup function that pre-warms critical routes.
 * This helps avoid 500 errors during tests caused by Next.js on-demand compilation.
 */
export default async function globalSetup(config: FullConfig): Promise<void> {
  // Get the base URL from config
  const baseURL = config.projects[0]?.use?.baseURL ?? "https://localhost:3000";

  console.log("[Global Setup] Starting route warmup...");
  console.log(`[Global Setup] Base URL: ${baseURL}`);

  const browser = await chromium.launch();
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();

  for (const route of CRITICAL_ROUTES) {
    const url = `${baseURL}${route}`;
    console.log(`[Global Setup] Warming up: ${route}`);

    try {
      // Navigate with generous timeout and retry once
      let response = await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });

      let status = response?.status();

      // If we get a 500, wait and retry once
      if (status === 500) {
        console.log(`[Global Setup] Got 500 for ${route}, retrying after delay...`);
        try {
          await page.waitForTimeout(3000);
          response = await page.goto(url, {
            waitUntil: "domcontentloaded",
            timeout: 30000,
          });
          status = response?.status();
        } catch {
          // Page may have been closed during wait, skip retry
          console.log(`[Global Setup] Retry aborted for ${route} (page closed)`);
        }
      }

      console.log(`[Global Setup] ${route} -> ${status}`);
    } catch (error) {
      console.log(`[Global Setup] ${route} -> Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  // Give the server a moment to stabilize after warmup
  try {
    await page.waitForTimeout(2000);
  } catch {
    // Page may have been closed during wait
  }

  await context.close();
  await browser.close();

  console.log("[Global Setup] Route warmup complete");
}
