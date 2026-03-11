/**
 * @fileoverview Main configuration export for Playwright tests.
 * Re-exports all configuration modules for convenient importing.
 * @module tests/config
 */

// Environment utilities
export {
  getBaseURL,
  getEnvironment,
  getEnvironmentConfig,
  getWorkerConfig,
  isCI,
  isLocal,
  type EnvironmentConfig,
  type TestEnvironment,
} from "./environment";

// Project configuration
export {
  DEVICE_PRESETS,
  PROJECT_GROUPS,
  createProject,
  createSetupProject,
  getProjectGroup,
  getProjectsForEnvironment,
  type CreateProjectOptions,
  type DevicePresetName,
} from "./projects";

// Reporter configuration
export {
  REPORTER_PATHS,
  getBlobReporter,
  getDotReporter,
  getGitHubReporter,
  getHtmlReporter,
  getJsonReporter,
  getJunitReporter,
  getLineReporter,
  getListReporter,
  getMergeReporters,
  getReportersForEnvironment,
  getShardedReporters,
} from "./reporters";

/**
 * Web server configuration for local development.
 */
export const WEB_SERVER_CONFIG = {
  command: "npx next dev --experimental-https",
  url: "https://localhost:3000",
  timeout: 300_000, // 5 minutes
  ignoreHTTPSErrors: true,
} as const;

/**
 * Output directories for test artifacts.
 */
export const OUTPUT_DIRS = {
  results: "code-cov/playwright-results",
  reports: "code-cov/playwright-report",
  screenshots: "code-cov/playwright-screenshots",
  videos: "code-cov/playwright-videos",
  traces: "code-cov/playwright-traces",
} as const;

/**
 * Common timeouts used across tests.
 */
export const TIMEOUTS = {
  /** Default test timeout */
  test: 90_000,
  /** Navigation timeout */
  navigation: 30_000,
  /** Element visibility timeout */
  element: 15_000,
  /** Action timeout (click, fill, etc.) */
  action: 10_000,
  /** Assertion timeout */
  expect: 10_000,
  /** Web server startup timeout */
  webServer: 300_000,
} as const;
