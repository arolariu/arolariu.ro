/**
 * @fileoverview Playwright E2E configuration for the CV platform.
 * @module sites/cv.arolariu.ro/playwright.config
 */

import {defineConfig, devices} from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [
    ["html", {outputFolder: "test-results/html-report"}],
    ["json", {outputFile: "test-results/results.json"}],
    ["list"],
  ],
  use: {
    baseURL: "http://localhost:4173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    ignoreHTTPSErrors: true,
  },
  projects: [
    {
      name: "chromium",
      use: {...devices["Desktop Chrome"]},
    },
    {
      name: "firefox",
      use: {...devices["Desktop Firefox"]},
    },
    {
      name: "webkit",
      use: {...devices["Desktop Safari"]},
    },
    {
      name: "mobile",
      use: {...devices["iPhone 14"]},
    },
  ],
  webServer: {
    command: "npm run preview",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
