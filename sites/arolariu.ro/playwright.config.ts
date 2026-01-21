/**
 * @fileoverview Playwright E2E configuration for the arolariu.ro website.
 * Uses modular configuration for easy extension and maintenance.
 * @module sites/arolariu.ro/playwright.config
 *
 * @remarks
 * Configuration is split into modules under tests/config/ for:
 * - Environment detection and settings
 * - Browser/device project definitions
 * - Reporter configuration
 *
 * @example
 * Run tests:
 * ```bash
 * # Run all tests
 * npx playwright test
 *
 * # Run smoke tests only
 * npx playwright test --grep @smoke
 *
 * # Run on specific browser
 * npx playwright test --project=chromium-desktop-e2e
 *
 * # Run with full browser matrix
 * TEST_ENV=local-full npx playwright test
 * ```
 */

import {defineConfig} from "@playwright/test";

import {
  getEnvironmentConfig,
  getProjectsForEnvironment,
  getReportersForEnvironment,
  getWorkerConfig,
  isCI,
  OUTPUT_DIRS,
  TIMEOUTS,
  WEB_SERVER_CONFIG,
} from "./tests/config";

// Get environment-specific configuration
const envConfig = getEnvironmentConfig();
const customWorkers = getWorkerConfig();

export default defineConfig({
  // ==================== Global Setup/Teardown ====================
  globalSetup: "./tests/global-setup.ts",
  globalTeardown: "./tests/global-teardown.ts",

  // ==================== Test Execution ====================
  fullyParallel: true,
  retries: envConfig.retries,
  workers: customWorkers ?? envConfig.workers,
  timeout: envConfig.timeout,
  maxFailures: envConfig.maxFailures,

  // ==================== Expect Configuration ====================
  expect: {
    timeout: TIMEOUTS.expect,
  },

  // ==================== Projects ====================
  projects: getProjectsForEnvironment(),

  // ==================== Output ====================
  outputDir: OUTPUT_DIRS.results,
  reporter: getReportersForEnvironment(),

  // ==================== Shared Settings ====================
  use: {
    // Base URL
    baseURL: envConfig.baseURL,

    // Security
    bypassCSP: true,
    ignoreHTTPSErrors: true,

    // Artifacts
    screenshot: "only-on-failure",
    trace: envConfig.trace,
    video: envConfig.video,

    // Timeouts
    actionTimeout: TIMEOUTS.action,
    navigationTimeout: TIMEOUTS.navigation,
  },

  // ==================== Web Server ====================
  webServer: [
    {
      command: WEB_SERVER_CONFIG.command,
      url: WEB_SERVER_CONFIG.url,
      timeout: WEB_SERVER_CONFIG.timeout,
      ignoreHTTPSErrors: WEB_SERVER_CONFIG.ignoreHTTPSErrors,
      reuseExistingServer: envConfig.reuseExistingServer,
      stdout: isCI() ? "pipe" : "ignore",
      // Ignore stderr to suppress harmless ECONNRESET errors during test cleanup.
      // These occur when the browser closes connections with pending requests.
      // Real server errors will still cause tests to fail.
      stderr: "ignore",
    },
  ],
});
