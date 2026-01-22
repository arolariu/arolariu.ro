/**
 * @fileoverview Centralized constants for GitHub Actions workflows
 * @module lib/workflow-constants
 *
 * This module provides a single source of truth for workflow configuration values.
 * Using these constants ensures consistency across all CI/CD scripts and workflows.
 *
 * @example
 * ```typescript
 * import { WORKFLOW_CONSTANTS } from '../lib/workflow-constants';
 *
 * const containerName = WORKFLOW_CONSTANTS.CONTAINER_NAMES.FRONTEND_PROD;
 * const nodeVersion = WORKFLOW_CONSTANTS.VERSIONS.NODE;
 * ```
 */

/**
 * Container image names used in Azure Container Registry
 */
export const CONTAINER_NAMES = {
  /** Development frontend container */
  FRONTEND_DEV: "frontend/dev.arolariu",
  /** Production frontend container */
  FRONTEND_PROD: "frontend/arolariu",
  /** Backend API container */
  BACKEND: "backend/api.arolariu",
} as const;

/**
 * Azure App Service names for deployment targets
 */
export const APP_SERVICE_NAMES = {
  /** Development frontend app service */
  FRONTEND_DEV: "dev-arolariu-ro",
  /** Production frontend app service */
  FRONTEND_PROD: "www-arolariu-ro",
  /** Backend API app service */
  BACKEND: "api-arolariu-ro",
} as const;

/**
 * Timeout values for workflow jobs (in minutes)
 */
export const TIMEOUTS = {
  /** Build job timeout */
  BUILD: 15,
  /** Test job timeout */
  TEST: 10,
  /** Deploy job timeout */
  DEPLOY: 10,
  /** E2E test job timeout */
  E2E: 30,
  /** Hygiene check job timeout */
  HYGIENE: 15,
} as const;

/**
 * Artifact retention periods (in days)
 */
export const ARTIFACT_RETENTION = {
  /** Default retention for debugging */
  DEFAULT: 7,
  /** Short retention for ephemeral artifacts */
  EPHEMERAL: 1,
  /** Long retention for release artifacts */
  RELEASE: 30,
} as const;

/**
 * Runtime versions used in workflows
 */
export const VERSIONS = {
  /** Node.js version */
  NODE: "24",
  /** .NET SDK version */
  DOTNET: "10",
} as const;

/**
 * Timing thresholds for workflow monitoring (in seconds)
 */
export const TIMING_THRESHOLDS = {
  /** Maximum expected hygiene check duration */
  HYGIENE_CHECK_MAX: 600, // 10 min
  /** Maximum expected website build duration */
  WEBSITE_BUILD_MAX: 900, // 15 min
  /** Maximum expected API build duration */
  API_BUILD_MAX: 600, // 10 min
  /** Maximum expected E2E test duration */
  E2E_TEST_MAX: 1800, // 30 min
} as const;

/**
 * GitHub API related constants
 */
export const GITHUB_CONSTANTS = {
  /** Maximum comment length for PR comments */
  MAX_COMMENT_LENGTH: 65536,
  /** Identifier prefix for hygiene comments */
  HYGIENE_COMMENT_ID: "<!-- arolariu-hygiene-check -->",
  /** Identifier prefix for E2E test comments */
  E2E_COMMENT_ID: "<!-- arolariu-e2e-test -->",
} as const;

/**
 * Consolidated workflow constants object
 *
 * @example
 * ```typescript
 * import { WORKFLOW_CONSTANTS } from '../lib/workflow-constants';
 *
 * console.log(WORKFLOW_CONSTANTS.CONTAINER_NAMES.FRONTEND_PROD);
 * console.log(WORKFLOW_CONSTANTS.TIMEOUTS.BUILD);
 * ```
 */
export const WORKFLOW_CONSTANTS = {
  CONTAINER_NAMES,
  APP_SERVICE_NAMES,
  TIMEOUTS,
  ARTIFACT_RETENTION,
  VERSIONS,
  TIMING_THRESHOLDS,
  GITHUB_CONSTANTS,
} as const;

export default WORKFLOW_CONSTANTS;
