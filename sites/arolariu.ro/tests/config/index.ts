/**
 * @fileoverview Main configuration export for Playwright tests.
 * Re-exports all configuration modules for convenient importing.
 * @module tests/config
 */

// Environment utilities
import {isProdBuild} from "./environment";

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
  createProject,
  createSetupProject,
  DEVICE_PRESETS,
  getProjectGroup,
  getProjectsForEnvironment,
  PROJECT_GROUPS,
  type CreateProjectOptions,
  type DevicePresetName,
} from "./projects";

// Reporter configuration
export {
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
  REPORTER_PATHS,
} from "./reporters";

/**
 * Web server configuration.
 * - CI and `E2E_USE_PROD=true` use a production build then run the standalone
 *   bundle (`node .next/standalone/sites/arolariu.ro/server.js`). The project
 *   uses `output: "standalone"` for Docker, so `next start` is a no-op — we
 *   invoke the bundled runner directly. Plain HTTP because the standalone
 *   server doesn't auto-generate certs.
 * - Local default stays on `next dev --experimental-https` so developers keep
 *   HMR + auto-generated HTTPS while iterating.
 */
export const WEB_SERVER_CONFIG = {
  command: isProdBuild()
    ? "npm run build && node scripts/prepareStandalone.ts && cross-env PORT=3000 HOSTNAME=0.0.0.0 node .next/standalone/sites/arolariu.ro/server.js"
    : "npx next dev --experimental-https",
  url: isProdBuild() ? "http://localhost:3000" : "https://localhost:3000",
  timeout: 240_000, // 4 min — accommodates `next build` (~30-90s) plus standalone startup
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
