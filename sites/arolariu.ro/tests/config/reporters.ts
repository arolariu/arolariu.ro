/**
 * @fileoverview Reporter configuration for Playwright tests.
 * Provides environment-aware reporter selection.
 * @module tests/config/reporters
 */

import type {ReporterDescription} from "@playwright/test";

import {getEnvironment, isCI} from "./environment";

/** Reporter output paths */
export const REPORTER_PATHS = {
  htmlOutput: "code-cov/playwright-report/html",
  jsonOutput: "code-cov/playwright-report/results.json",
  junitOutput: "code-cov/playwright-report/junit.xml",
  blobOutput: "code-cov/playwright-report/blob",
} as const;

/**
 * HTML reporter configuration.
 */
export function getHtmlReporter(): ReporterDescription {
  return [
    "html",
    {
      outputFolder: REPORTER_PATHS.htmlOutput,
      open: "never",
    },
  ];
}

/**
 * JSON reporter configuration.
 */
export function getJsonReporter(): ReporterDescription {
  return [
    "json",
    {
      outputFile: REPORTER_PATHS.jsonOutput,
    },
  ];
}

/**
 * JUnit reporter configuration (for CI integration).
 */
export function getJunitReporter(): ReporterDescription {
  return [
    "junit",
    {
      outputFile: REPORTER_PATHS.junitOutput,
    },
  ];
}

/**
 * List reporter configuration (for local development).
 */
export function getListReporter(): ReporterDescription {
  return [
    "list",
    {
      printSteps: true,
    },
  ];
}

/**
 * Line reporter configuration (minimal output).
 */
export function getLineReporter(): ReporterDescription {
  return ["line"];
}

/**
 * Dot reporter configuration (most minimal).
 */
export function getDotReporter(): ReporterDescription {
  return ["dot"];
}

/**
 * GitHub Actions reporter configuration.
 */
export function getGitHubReporter(): ReporterDescription {
  return ["github"];
}

/**
 * Blob reporter configuration (for sharded test merging).
 */
export function getBlobReporter(): ReporterDescription {
  return [
    "blob",
    {
      outputDir: REPORTER_PATHS.blobOutput,
    },
  ];
}

/**
 * Get reporters appropriate for the current environment.
 *
 * @returns Array of reporter configurations
 */
export function getReportersForEnvironment(): ReporterDescription[] {
  const env = getEnvironment();

  // Base reporters for all environments
  const baseReporters: ReporterDescription[] = [getHtmlReporter(), getJsonReporter(), getJunitReporter()];

  switch (env) {
    case "ci":
      // CI: Add GitHub reporter for PR annotations
      return [...baseReporters, getGitHubReporter()];

    case "local":
      // Local: Add list reporter for detailed console output
      return [...baseReporters, getListReporter()];

    case "local-full":
      // Full local: Same as local
      return [...baseReporters, getListReporter()];

    case "staging":
    case "production":
      // Remote environments: Minimal console output
      return [...baseReporters, getLineReporter()];

    default:
      return [...baseReporters, isCI() ? getGitHubReporter() : getListReporter()];
  }
}

/**
 * Get reporters for sharded test execution.
 * Use blob reporter for collecting results across shards.
 *
 * @returns Array of reporter configurations for sharding
 */
export function getShardedReporters(): ReporterDescription[] {
  return [getBlobReporter(), isCI() ? getGitHubReporter() : getListReporter()];
}

/**
 * Get reporters for merging sharded results.
 * Use after collecting blob reports from all shards.
 *
 * @returns Array of reporter configurations for merge
 */
export function getMergeReporters(): ReporterDescription[] {
  return [getHtmlReporter(), getJsonReporter(), getJunitReporter()];
}
