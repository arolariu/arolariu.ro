/**
 * @fileoverview Unified type definitions for the hygiene check system.
 * @module github/scripts/src/hygiene/types
 *
 * @remarks
 * This module defines the canonical data structures used throughout the hygiene check
 * pipeline. All check modules produce `HygieneCheckResult` objects that are serialized
 * to JSON artifacts and consumed by the summary job to build rich PR comments.
 *
 * Architecture:
 * - Each check job (format, lint, test, stats) produces a `{check}-result.json` artifact
 * - The summary job downloads all artifacts and aggregates them into a `HygieneReport`
 * - The `commentBuilder` consumes the report to generate a rich PR comment
 *
 * @example
 * ```typescript
 * // In a check module
 * const result: HygieneCheckResult = {
 *   check: 'format',
 *   status: 'failure',
 *   duration: 1250,
 *   summary: '3 files need formatting',
 *   files: [...],
 * };
 * await writeJsonArtifact('format-result.json', result);
 * ```
 */

// =============================================================================
// CHECK RESULT TYPES
// =============================================================================

/**
 * Types of hygiene checks supported by the system
 */
export type HygieneCheckType = "format" | "lint" | "test" | "stats";

/**
 * Possible statuses for a hygiene check
 */
export type HygieneCheckStatus = "success" | "failure" | "skipped" | "error";

/**
 * Represents a file with issues detected during a check
 */
export interface FileIssue {
  /** Absolute or relative file path */
  readonly path: string;
  /** Optional line number where issue starts */
  readonly line?: number;
  /** Optional column number */
  readonly column?: number;
  /** Issue severity */
  readonly severity: "error" | "warning" | "info";
  /** Human-readable issue message */
  readonly message: string;
  /** Optional rule/check identifier (e.g., ESLint rule name) */
  readonly ruleId?: string;
}

/**
 * Test result from Vitest JSON reporter
 */
export interface TestResult {
  /** Test file path */
  readonly file: string;
  /** Test suite/describe block name */
  readonly suite: string;
  /** Individual test name */
  readonly name: string;
  /** Test outcome */
  readonly status: "passed" | "failed" | "skipped" | "todo";
  /** Duration in milliseconds */
  readonly duration: number;
  /** Error message if failed */
  readonly error?: string;
}

/**
 * Aggregated test statistics
 */
export interface TestSummary {
  /** Total number of test files */
  readonly totalFiles: number;
  /** Total number of test suites */
  readonly totalSuites: number;
  /** Total number of tests */
  readonly totalTests: number;
  /** Number of passed tests */
  readonly passed: number;
  /** Number of failed tests */
  readonly failed: number;
  /** Number of skipped tests */
  readonly skipped: number;
  /** Number of todo tests */
  readonly todo: number;
  /** Total duration in milliseconds */
  readonly duration: number;
}

/**
 * Coverage statistics for a metric type
 */
export interface CoverageMetric {
  /** Total items (lines, statements, etc.) */
  readonly total: number;
  /** Covered items */
  readonly covered: number;
  /** Coverage percentage (0-100) */
  readonly percentage: number;
}

/**
 * Complete coverage summary
 */
export interface CoverageSummary {
  /** Line coverage */
  readonly lines: CoverageMetric;
  /** Statement coverage */
  readonly statements: CoverageMetric;
  /** Function coverage */
  readonly functions: CoverageMetric;
  /** Branch coverage */
  readonly branches: CoverageMetric;
}

// =============================================================================
// BUNDLE SIZE TYPES
// =============================================================================

/**
 * Size comparison for a single file
 */
export interface FileSizeComparison {
  /** File path relative to folder */
  readonly path: string;
  /** Size in main branch (bytes) */
  readonly mainSize: number;
  /** Size in preview/PR branch (bytes) */
  readonly previewSize: number;
  /** Difference (preview - main) */
  readonly diff: number;
  /** Change status */
  readonly status: "added" | "removed" | "modified" | "unchanged";
}

/**
 * Bundle size comparison for a target folder
 */
export interface BundleFolderComparison {
  /** Folder path being analyzed */
  readonly folder: string;
  /** Total size in main branch */
  readonly mainTotal: number;
  /** Total size in preview branch */
  readonly previewTotal: number;
  /** Total difference */
  readonly totalDiff: number;
  /** Number of files changed */
  readonly filesChanged: number;
  /** Individual file comparisons (only changed files) */
  readonly files: readonly FileSizeComparison[];
}

// =============================================================================
// STATS TYPES
// =============================================================================

/**
 * Git diff statistics
 */
export interface DiffStats {
  /** Number of files changed */
  readonly filesChanged: number;
  /** Lines added */
  readonly linesAdded: number;
  /** Lines deleted */
  readonly linesDeleted: number;
}

/**
 * Extension distribution (top extensions by file count)
 */
export interface ExtensionStats {
  /** File extension (e.g., 'ts', 'tsx', 'md') */
  readonly extension: string;
  /** Number of files with this extension */
  readonly count: number;
}

/**
 * Directory impact (top directories by file count)
 */
export interface DirectoryStats {
  /** Directory name */
  readonly directory: string;
  /** Number of changed files in this directory */
  readonly count: number;
}

/**
 * Complete statistics result
 */
export interface StatsResult {
  /** Diff stats comparing to main branch */
  readonly vsMain: DiffStats;
  /** Diff stats comparing to previous commit (null if first commit) */
  readonly vsPrevious: DiffStats | null;
  /** Whether this is the first commit in the PR */
  readonly isFirstCommit: boolean;
  /** Code churn (lines added + deleted) */
  readonly churn: number;
  /** Net change (lines added - deleted) */
  readonly netChange: number;
  /** Top file extensions changed */
  readonly topExtensions: readonly ExtensionStats[];
  /** Top directories impacted */
  readonly topDirectories: readonly DirectoryStats[];
  /** Bundle size comparisons */
  readonly bundleSizes: readonly BundleFolderComparison[];
}

// =============================================================================
// UNIFIED CHECK RESULT
// =============================================================================

/**
 * Base structure for all hygiene check results
 *
 * This is the canonical format that all check modules produce.
 * Each check serializes this to `{check}-result.json` and uploads as an artifact.
 */
export interface HygieneCheckResult {
  /** Type of check performed */
  readonly check: HygieneCheckType;

  /** Check outcome status */
  readonly status: HygieneCheckStatus;

  /** Execution duration in milliseconds */
  readonly duration: number;

  /** Human-readable summary of the result */
  readonly summary: string;

  /** Timestamp when check completed (ISO 8601) */
  readonly timestamp: string;

  // =========================================================================
  // FORMAT CHECK FIELDS (check === 'format')
  // =========================================================================

  /** Files that need formatting (format check only) */
  readonly filesNeedingFormat?: readonly string[];

  // =========================================================================
  // LINT CHECK FIELDS (check === 'lint')
  // =========================================================================

  /** Lint issues by file (lint check only) */
  readonly lintIssues?: readonly FileIssue[];

  /** Total error count (lint check only) */
  readonly errorCount?: number;

  /** Total warning count (lint check only) */
  readonly warningCount?: number;

  /** Raw lint output for debugging (truncated) */
  readonly rawOutput?: string;

  // =========================================================================
  // TEST CHECK FIELDS (check === 'test')
  // =========================================================================

  /** Test summary statistics (test check only) */
  readonly testSummary?: TestSummary;

  /** Failed test details (test check only) */
  readonly failedTests?: readonly TestResult[];

  /** Coverage summary if available (test check only) */
  readonly coverage?: CoverageSummary;

  // =========================================================================
  // STATS CHECK FIELDS (check === 'stats')
  // =========================================================================

  /** Complete statistics result (stats check only) */
  readonly stats?: StatsResult;

  // =========================================================================
  // ERROR HANDLING
  // =========================================================================

  /** Error message if status is 'error' */
  readonly error?: string;

  /** Stack trace for debugging (only in error state) */
  readonly stack?: string;
}

// =============================================================================
// AGGREGATED REPORT
// =============================================================================

/**
 * Aggregated hygiene report combining all check results
 *
 * This is the structure consumed by the comment builder to generate
 * the rich PR comment.
 */
export interface HygieneReport {
  /** All check results indexed by check type */
  readonly checks: {
    readonly format?: HygieneCheckResult;
    readonly lint?: HygieneCheckResult;
    readonly test?: HygieneCheckResult;
    readonly stats?: HygieneCheckResult;
  };

  /** Overall status (failure if any check failed) */
  readonly overallStatus: HygieneCheckStatus;

  /** Commit SHA being checked */
  readonly commitSha: string;

  /** PR number if applicable */
  readonly prNumber?: number;

  /** Workflow run ID for linking */
  readonly workflowRunId: string;

  /** Workflow run URL for easy debugging */
  readonly workflowRunUrl: string;

  /** Report generation timestamp (ISO 8601) */
  readonly generatedAt: string;
}

// =============================================================================
// HELPER TYPE GUARDS
// =============================================================================

/**
 * Type guard to check if a result is a format check result
 */
export function isFormatResult(result: HygieneCheckResult): result is HygieneCheckResult & {check: "format"} {
  return result.check === "format";
}

/**
 * Type guard to check if a result is a lint check result
 */
export function isLintResult(result: HygieneCheckResult): result is HygieneCheckResult & {check: "lint"} {
  return result.check === "lint";
}

/**
 * Type guard to check if a result is a test check result
 */
export function isTestResult(result: HygieneCheckResult): result is HygieneCheckResult & {check: "test"} {
  return result.check === "test";
}

/**
 * Type guard to check if a result is a stats check result
 */
export function isStatsResult(result: HygieneCheckResult): result is HygieneCheckResult & {check: "stats"} {
  return result.check === "stats";
}

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

/**
 * Creates a successful check result
 */
export function createSuccessResult(
  check: HygieneCheckType,
  summary: string,
  duration: number,
  extras?: Partial<HygieneCheckResult>,
): HygieneCheckResult {
  return {
    check,
    status: "success",
    duration,
    summary,
    timestamp: new Date().toISOString(),
    ...extras,
  };
}

/**
 * Creates a failed check result
 */
export function createFailureResult(
  check: HygieneCheckType,
  summary: string,
  duration: number,
  extras?: Partial<HygieneCheckResult>,
): HygieneCheckResult {
  return {
    check,
    status: "failure",
    duration,
    summary,
    timestamp: new Date().toISOString(),
    ...extras,
  };
}

/**
 * Creates an error check result (for unexpected failures)
 */
export function createErrorResult(check: HygieneCheckType, error: Error, duration: number): HygieneCheckResult {
  const result: HygieneCheckResult = {
    check,
    status: "error",
    duration,
    summary: `Check failed with error: ${error.message}`,
    timestamp: new Date().toISOString(),
    error: error.message,
  };

  // Only include stack if defined
  if (error.stack !== undefined) {
    return {...result, stack: error.stack};
  }

  return result;
}

/**
 * Creates a skipped check result
 */
export function createSkippedResult(check: HygieneCheckType, reason: string): HygieneCheckResult {
  return {
    check,
    status: "skipped",
    duration: 0,
    summary: reason,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Calculates overall status from individual check results
 */
export function calculateOverallStatus(checks: Partial<Record<HygieneCheckType, HygieneCheckResult>>): HygieneCheckStatus {
  const results = Object.values(checks).filter(Boolean) as HygieneCheckResult[];

  if (results.length === 0) {
    return "skipped";
  }

  // Any error means overall error
  if (results.some((r) => r.status === "error")) {
    return "error";
  }

  // Any failure means overall failure
  if (results.some((r) => r.status === "failure")) {
    return "failure";
  }

  // All skipped means skipped
  if (results.every((r) => r.status === "skipped")) {
    return "skipped";
  }

  return "success";
}
