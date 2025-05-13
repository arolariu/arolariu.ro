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
  retries: 1,
  reporter: weAreInCI ? "github" : "html",

  projects: projectsToRun,

  webServer: [
    {
      command: "npm run dev",
      reuseExistingServer: !weAreInCI,
      url: "https://localhost:3000", // Ensure this matches your dev server
      timeout: 300 * 1000, // 300 seconds - 5 minutes
      ignoreHTTPSErrors: true, // Add if using self-signed certs for the server itself
    },
  ],
});

