/** @format */

import {defineConfig, devices} from "@playwright/test";

export default defineConfig({
  retries: process.env["CI"] ? 2 : 0,
  workers: process.env["CI"] ? 1 : undefined,
  reporter: "html",

  projects: [
    {
      name: "e2e-chromium",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "https://localhost:3000",
        ignoreHTTPSErrors: true,
      },
      testMatch: "src/**/*.spec.ts",
    },
    {
      name: "e2e-webkit",
      use: {
        ...devices["Desktop Safari"],
        baseURL: "https://localhost:3000",
        ignoreHTTPSErrors: true,
      },
      testMatch: "src/**/*.spec.ts",
    },
  ],

  webServer: [
    {
      command: "npm run dev",
      url: "https://localhost:3000", // Ensure this matches your dev server
      reuseExistingServer: !process.env["CI"],
      timeout: 120 * 1000,
      ignoreHTTPSErrors: true, // Add if using self-signed certs for the server itself
    },
  ],
});
