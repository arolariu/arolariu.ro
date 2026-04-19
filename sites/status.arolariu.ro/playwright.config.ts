import {defineConfig, devices} from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [["html", {outputFolder: "test-results/html-report"}], ["list"]],
  use: {
    baseURL: "http://localhost:4175",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {name: "chromium", use: {...devices["Desktop Chrome"]}},
    {name: "firefox", use: {...devices["Desktop Firefox"]}},
  ],
  webServer: {
    command: "npm run preview",
    url: "http://localhost:4175",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
