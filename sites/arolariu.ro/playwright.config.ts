/** @format */

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
    timeout: 60 * 1000, // 60 seconds - 1 minute
    testMatch: "src/**/*.spec.{ts,tsx}",
  },
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
    name: "webkit-desktop-e2e",
    use: {
      ...devices["Desktop Safari"],
      baseURL: "https://localhost:3000",
      ignoreHTTPSErrors: true,
    },
    timeout: 60 * 1000, // 60 seconds - 1 minute
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
  fullyParallel: true,
  retries: weAreInCI ? 1 : 2,
  workers: "75%",
  timeout: 60 * 1000, // 60 seconds - 1 minute
  projects: projectsToRun,
  outputDir: "code-cov/playwright-report",

  reporter: [
    ["html", {outputFolder: "code-cov/playwright-report/html", open: "never"}],
    ["json", {outputFile: "code-cov/playwright-report/results.json"}],
    ["junit", {outputFile: "code-cov/playwright-report/junit.xml"}],
    weAreInCI ? ["github"] : ["list", {printSteps: true}],
  ],

  use: {
    trace: "on-first-retry",
    video: weAreInCI ? "retain-on-failure" : "on-first-retry",
  },

  webServer: [
    {
      command: "npm run dev",
      reuseExistingServer: !weAreInCI,
      url: "https://localhost:3000",
      timeout: 300 * 1000, // 300 seconds - 5 minutes
      ignoreHTTPSErrors: true, // Add if using self-signed certs for the server itself
    },
  ],
});
