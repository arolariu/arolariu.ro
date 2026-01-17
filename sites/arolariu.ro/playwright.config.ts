/**
 * @fileoverview Playwright E2E configuration for the arolariu.ro website.
 * @module sites/arolariu.ro/playwright.config
 *
 * @remarks
 * Defines local/CI projects and common settings (baseURL, timeouts, reporters).
 */

import {defineConfig, devices} from "@playwright/test";

const weAreInCI = Boolean(process.env["CI"]);

const allProjects = [
  {
    name: "chromium-desktop-e2e",
    use: {
      ...devices["Desktop Chrome"],
      baseURL: "https://localhost:3000",
      ignoreHTTPSErrors: true,
    },
    timeout: 90 * 1000, // 90 seconds - increased for CI warmup
    testMatch: "src/**/*.spec.{ts,tsx}",
  },
  {
    name: "firefox-desktop-e2e",
    use: {
      ...devices["Desktop Firefox"],
      baseURL: "https://localhost:3000",
      ignoreHTTPSErrors: true,
    },
    timeout: 90 * 1000, // 90 seconds - increased for CI warmup
    testMatch: "src/**/*.spec.{ts,tsx}",
  },
  {
    name: "webkit-desktop-e2e",
    use: {
      ...devices["Desktop Safari"],
      baseURL: "https://localhost:3000",
      ignoreHTTPSErrors: true,
    },
    timeout: 90 * 1000, // 90 seconds - increased for CI warmup
    testMatch: "src/**/*.spec.{ts,tsx}",
  },
];

const projectsToRun = allProjects.filter((project) => {
  if (weAreInCI) {
    return (
      project.name !== "webkit-desktop-e2e" // Skip WebKit in CI
      && project.name !== "firefox-desktop-e2e" // Skip Firefox in CI
    );
  }
  return true; // Run all projects locally
});

export default defineConfig({
  globalSetup: "./tests/global-setup.ts",
  fullyParallel: true,
  retries: weAreInCI ? 2 : 2, // Increased CI retries for flaky warmup issues
  workers: weAreInCI ? "75%" : "100%",
  timeout: 90 * 1000, // 90 seconds - increased for CI warmup
  projects: projectsToRun,
  // Keep test artifacts separate from report output.
  // Playwright clears the HTML report output folder prior to generation;
  // if it overlaps with the test output folder, artifacts can be lost.
  outputDir: "code-cov/playwright-results",
  maxFailures: weAreInCI ? 5 : 10, // Stop after these many failures

  reporter: [
    ["html", {outputFolder: "code-cov/playwright-report/html", open: "never"}],
    ["json", {outputFile: "code-cov/playwright-report/results.json"}],
    ["junit", {outputFile: "code-cov/playwright-report/junit.xml"}],
    weAreInCI ? ["github"] : ["list", {printSteps: true}],
  ],

  use: {
    bypassCSP: true,
    ignoreHTTPSErrors: true,
    screenshot: "only-on-failure",
    trace: "on-first-retry",
    video: weAreInCI ? "retain-on-failure" : "on-first-retry",
  },

  webServer: [
    {
      command: "npm run dev",
      reuseExistingServer: !weAreInCI,
      url: "https://localhost:3000",
      timeout: 300 * 1000, // 300 seconds - 5 minutes
      ignoreHTTPSErrors: true,
    },
  ],
});
