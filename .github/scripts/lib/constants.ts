/**
 * @fileoverview Configuration constants for CI scripts
 * @module lib/constants
 */

/**
 * Default number of lines to read from the end of log files
 */
export const DEFAULT_LOG_TAIL_LENGTH = 50;

/**
 * Maximum number of issues to return when searching for duplicates
 */
export const MAX_ISSUE_SEARCH_RESULTS = 10;

/**
 * Default GitHub server URL
 */
export const DEFAULT_GITHUB_SERVER_URL = "https://github.com";

/**
 * Default artifacts directory name
 */
export const DEFAULT_ARTIFACTS_DIR = "logs";

/**
 * Subfolder name for backend test logs
 */
export const BACKEND_LOGS_SUBFOLDER = "backend-test-logs";

/**
 * Filename for backend health check JSON
 */
export const HEALTH_CHECK_FILENAME = "backend-health.json";

/**
 * Git command options for fetching main branch
 */
export const GIT_FETCH_MAIN_OPTIONS = "git fetch origin main:refs/remotes/origin/main --depth=1 --no-tags --quiet";

/**
 * Git reference for main branch
 */
export const MAIN_BRANCH_REF = "refs/remotes/origin/main";

/**
 * Git reference for current HEAD
 */
export const HEAD_REF = "HEAD";

/**
 * Bundle size analysis target folders
 */
export const BUNDLE_TARGET_FOLDERS: string[] = ["sites/arolariu.ro", "sites/api.arolariu.ro", "sites/docs.arolariu.ro"];

/**
 * Status emoji mapping
 */
export const STATUS_EMOJI = {
  success: "✅",
  failure: "❌",
  cancelled: "⚠️",
  skipped: "⚠️",
  unknown: "⚠️",
} as const;

/**
 * Issue labels for automated test failures
 */
export const AUTOMATED_TEST_FAILURE_LABELS: string[] = ["bug", "automated-test-failure"];

/**
 * Default timezone for test execution
 */
export const DEFAULT_TIMEZONE = "Europe/Bucharest";
