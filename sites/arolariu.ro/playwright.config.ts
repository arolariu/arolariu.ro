/** @format */

import {defineConfig, devices} from "@playwright/test";

export default defineConfig({
  fullyParallel: true,
  retries: 1,
  reporter: "html",

  projects: [
    {
      name: "firefox-desktop-e2e",
      use: {
        ...devices["Desktop Firefox"],
        baseURL: "https://localhost:3000",
        ignoreHTTPSErrors: true,
      },
      timeout: 60 * 1000, // 60 seconds - 1 minute
      testMatch: "src/**/*.spec.{ts,tsx}",
    },
    {
      name: "chromium-desktop-e2e",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "https://localhost:3000",
        ignoreHTTPSErrors: true,
      },
      timeout: 60 * 1000, // 60 seconds - 1 minute
      testMatch: "src/**/*.spec.{ts,tsx}",
    },
    {
      name: "webkit-desktop-e2e",
      use: {
        ...devices["Desktop Safari"],
        baseURL: "https://localhost:3000",
        ignoreHTTPSErrors: true,
      },
      timeout: 60 * 1000, // 60 seconds - 1 minute
      testMatch: "src/**/*.spec.{ts,tsx}",
    },
  ],

  webServer: [
    {
      command: "npm run dev",
      reuseExistingServer: true,
      url: "https://localhost:3000", // Ensure this matches your dev server
      timeout: 300 * 1000, // 300 seconds - 5 minutes
      ignoreHTTPSErrors: true, // Add if using self-signed certs for the server itself
    },
  ],
});
