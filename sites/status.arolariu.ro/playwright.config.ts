import {defineConfig, devices} from "@playwright/test";

const isCI = Boolean(process.env["CI"]);

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  ...(isCI ? {workers: 2} : {}),
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
    reuseExistingServer: !isCI,
    timeout: 120000,
  },
});
