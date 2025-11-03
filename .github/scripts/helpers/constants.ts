/**
 * @fileoverview Centralized constants for GitHub Actions scripts
 * @module helpers/constants
 *
 * This module consolidates all configuration constants used across GitHub Actions
 * workflows and scripts into a single source of truth.
 */

/**
 * Default number of lines to read from the end of log files
 * Used for tail operations when displaying log excerpts in issues/comments
 */
export const DEFAULT_LOG_TAIL_LENGTH = 50;

/**
 * Default GitHub server URL
 * Used for constructing GitHub resource URLs (commits, PRs, workflows)
 */
export const DEFAULT_GITHUB_SERVER_URL = "https://github.com";

/**
 * Default artifacts directory name
 * Base directory where test artifacts (logs, reports, screenshots) are stored
 */
export const DEFAULT_ARTIFACTS_DIR = "logs";

/**
 * Filename for backend health check JSON
 * Expected filename for backend health check data in artifacts
 */
export const HEALTH_CHECK_FILENAME = "backend-health.json";

/**
 * Bundle size analysis target folders
 * Folders to analyze for bundle size changes between branches
 */
export const BUNDLE_TARGET_FOLDERS: readonly string[] = ["sites/arolariu.ro", "sites/api.arolariu.ro", "sites/docs.arolariu.ro"] as const;

/**
 * Status emoji mapping for workflow states
 * Maps workflow/job/test statuses to their corresponding emoji
 *
 * @remarks
 * Note: Different actions may use slightly different emoji sets
 * - runUnitTestAction uses ⏭️ for 'skipped'
 * - runLiveTestAction and runHygieneCheck use ⚠️ for 'skipped'
 */
export const STATUS_EMOJI = {
  success: "✅",
  failure: "❌",
  cancelled: "⚠️",
  skipped: "⚠️",
  unknown: "⚠️",
} as const;

/**
 * Status emoji mapping for unit test actions
 * Variant with different 'skipped' emoji
 */
export const STATUS_EMOJI_UNIT_TESTS = {
  success: "✅",
  failure: "❌",
  cancelled: "⚠️",
  skipped: "⏭️",
  unknown: "❓",
} as const;

/**
 * Issue labels for automated test failures
 * Applied to issues created by automated test failure detection
 */
export const AUTOMATED_TEST_FAILURE_LABELS: readonly string[] = ["bug", "automated-test-failure"] as const;

/**
 * Comment identifier for hygiene check comments
 * Hidden HTML comment used to identify and update existing hygiene check comments
 */
export const HYGIENE_CHECK_COMMENT_IDENTIFIER = "arolariu-hygiene-check-comment";
