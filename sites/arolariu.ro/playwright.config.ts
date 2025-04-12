/** @format */

import {defineConfig, devices} from "@playwright/test";

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testMatch: "**/*.spec.ts",
  retries: process.env["CI"] ? 2 : 0,
  workers: process.env["CI"] ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },

  projects: [
    {
      name: "chromium",
      use: {...devices["Desktop Chrome"]},
    },
    {
      name: "webkit",
      use: {...devices["Desktop Safari"]},
    },
  ],

  webServer: {
    command: "next dev",
    timeout: 60000 * 3, // 3 minutes
    url: "http://localhost:3000",
    reuseExistingServer: true,
  },
});
