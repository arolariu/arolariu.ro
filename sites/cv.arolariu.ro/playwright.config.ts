/**
 * @fileoverview Playwright E2E configuration for the CV platform.
 * @module sites/cv.arolariu.ro/playwright.config
 */

import {defineConfig, devices} from "@playwright/test";

const isCI = Boolean(process.env["CI"]);

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 2 : 1,
  reporter: [["html", {outputFolder: "test-results/html-report"}], ["json", {outputFile: "test-results/results.json"}], ["list"]],
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
    reuseExistingServer: !isCI,
    timeout: 120000,
  },
});
