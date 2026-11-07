/**
 * @fileoverview Playwright test results parser and formatter helper.
 * @module github/scripts/helpers/playwright
 *
 * @remarks
 * This module provides comprehensive utilities for parsing and formatting Playwright test results
 * following SOLID principles and clean architecture patterns.
 *
 * **Key Features:**
 * - Parse Playwright JSON test results
 * - Extract test statistics (passed, failed, skipped, flaky)
 * - Categorize failures by type (assertion, timeout, etc.)
 * - Generate formatted markdown sections for test reports
 * - Link to HTML reports and test artifacts
 * - Type-safe test result structures
 *
 * **Architecture:**
 * - Interface-based design (IPlaywrightHelper) for easy testing and mocking
 * - Pure functions for parsing and formatting operations
 * - Immutable data structures
 * - Single responsibility principle throughout
 *
 * @example
 * ```typescript
 * import { playwright } from './helpers/index.ts';
 *
 * // Parse test results
 * const results = await playwright.parseResults('test-results.json', fs);
 *
 * // Generate markdown section
 * const markdown = playwright.generateMarkdownSection(results, {
 *   workflowRunUrl: 'https://github.com/owner/repo/actions/runs/123',
 *   includeFailureDetails: true
 * });
 * ```
 */

import type {IFileSystemHelper} from "../filesystem/index.ts";
import {MarkdownUtils} from "../comments/index.ts";
import {redactEvidenceText} from "../reports/redact.ts";
import {array, count, finite, MAX_REPORT_BYTES, record, text} from "../reports/validation.ts";

/**
 * Test status types in Playwright
 */
export type TestStatus = "passed" | "failed" | "skipped" | "flaky" | "timedOut" | "interrupted";

/**
 * Test failure error information
 */
export interface TestError {
  /** Error message */
  readonly message: string;
  /** Error stack trace (if available) */
  readonly stack?: string;
  /** Snippet of failing code (if available) */
  readonly snippet?: string;
}

/**
 * Individual test case result
 */
export interface TestCase {
  /** Test title/name */
  readonly title: string;
  /** Full test path (file + describe blocks) */
  readonly fullTitle: string;
  /** Test file path */
  readonly file: string;
  /** Test status */
  readonly status: TestStatus;
  /** Test duration in milliseconds */
  readonly duration: number;
  /** Error information (if failed) */
  readonly error?: TestError | undefined;
  /** Number of retry attempts */
  readonly retries?: number | undefined;
  /** Browser/project name */
  readonly project?: string | undefined;
}

/**
 * Test suite statistics
 */
export interface TestStatistics {
  /** Total number of tests */
  readonly total: number;
  /** Number of passed tests */
  readonly passed: number;
  /** Number of failed tests */
  readonly failed: number;
  /** Number of skipped tests */
  readonly skipped: number;
  /** Number of flaky tests (passed after retry) */
  readonly flaky: number;
  /** Total duration in milliseconds */
  readonly duration: number;
}

/**
 * Categorized test failures for Playwright tests
 */
export interface PlaywrightFailureCategories {
  /** Assertion failures */
  readonly assertions: readonly TestCase[];
  /** Timeout failures */
  readonly timeouts: readonly TestCase[];
  /** Other failures */
  readonly other: readonly TestCase[];
}

/**
 * Parsed Playwright test results
 */
export interface ParsedTestResults {
  /** Test statistics summary */
  readonly statistics: TestStatistics;
  /** All test cases */
  readonly tests: readonly TestCase[];
  /** Failed test cases */
  readonly failures: readonly TestCase[];
  /** Flaky test cases */
  readonly flaky: readonly TestCase[];
  /** Categorized failures */
  readonly categories: PlaywrightFailureCategories;
  /** Global setup/teardown/runner errors, separate from assertion failure counts. */
  readonly errors?: readonly TestError[];
}

/**
 * Options for markdown section generation
 */
export interface PlaywrightMarkdownOptions {
  /** Workflow run URL for artifact links */
  readonly workflowRunUrl?: string;
  /** Include detailed failure information (default: true) */
  readonly includeFailureDetails?: boolean;
  /** Maximum number of failures to display (default: 10) */
  readonly maxFailuresToShow?: number;
  /** Include flaky test information (default: true) */
  readonly includeFlakyTests?: boolean;
  /** Custom section title (default: "🎭 Playwright Tests") */
  readonly title?: string;
  /** Show duration statistics (default: true) */
  readonly showDuration?: boolean;
}

/**
 * Raw Playwright JSON test result structure (simplified)
 */
interface PlaywrightResult {
  readonly status?: TestStatus;
  readonly duration?: number;
  readonly error?: TestError;
  readonly retry?: number;
}
interface PlaywrightTest {
  readonly status?: string;
  readonly expectedStatus?: string;
  readonly projectName?: string;
  readonly results?: readonly PlaywrightResult[];
}
interface PlaywrightSpec {
  readonly title?: string;
  readonly file?: string;
  readonly tests?: readonly PlaywrightTest[];
}
interface PlaywrightSuite {
  readonly title?: string;
  readonly file?: string;
  readonly specs?: readonly PlaywrightSpec[];
  readonly suites?: readonly PlaywrightSuite[];
}
interface PlaywrightJSONReport {
  readonly suites?: readonly PlaywrightSuite[];
  readonly errors?: readonly TestError[];
  readonly stats?: {
    readonly expected?: number;
    readonly unexpected?: number;
    readonly flaky?: number;
    readonly skipped?: number;
    readonly duration?: number;
  };
}

function optionalText(value: Record<string, unknown>, field: string): string | undefined {
  return value[field] === undefined ? undefined : text(value[field], `Playwright ${field}`);
}

function decodeError(value: unknown): TestError {
  const raw = record(value, "Playwright error");
  const stack = optionalText(raw, "stack");
  const snippet = optionalText(raw, "snippet");
  return {
    message: optionalText(raw, "message") ?? optionalText(raw, "value") ?? "Unknown error",
    ...(stack === undefined ? {} : {stack}),
    ...(snippet === undefined ? {} : {snippet}),
  };
}

function decodeResult(value: unknown): PlaywrightResult {
  const raw = record(value, "Playwright result");
  const status = optionalText(raw, "status");
  if (
    status !== undefined
    && status !== "passed"
    && status !== "failed"
    && status !== "skipped"
    && status !== "timedOut"
    && status !== "interrupted"
    && status !== "flaky"
  )
    throw new TypeError("Invalid Playwright result status");
  const errorValue = raw["error"] ?? (raw["errors"] === undefined ? undefined : array(raw["errors"], "Playwright errors")[0]);
  const error = errorValue === undefined ? undefined : decodeError(errorValue);
  return {
    ...(status === undefined ? {} : {status}),
    ...(raw["duration"] === undefined ? {} : {duration: finite(raw["duration"], "Playwright duration")}),
    ...(raw["retry"] === undefined ? {} : {retry: count(raw["retry"], "Playwright retry")}),
    ...(error === undefined ? {} : {error}),
  };
}

function decodeSuite(value: unknown): PlaywrightSuite {
  const raw = record(value, "Playwright suite");
  const title = optionalText(raw, "title");
  const file = optionalText(raw, "file");
  return {
    ...(title === undefined ? {} : {title}),
    ...(file === undefined ? {} : {file}),
    ...(raw["suites"] === undefined ? {} : {suites: array(raw["suites"], "Playwright suites").map(decodeSuite)}),
    ...(raw["specs"] === undefined
      ? {}
      : {
          specs: array(raw["specs"], "Playwright specs").map((value): PlaywrightSpec => {
            const spec = record(value, "Playwright spec");
            const title = optionalText(spec, "title");
            const file = optionalText(spec, "file");
            return {
              ...(title === undefined ? {} : {title}),
              ...(file === undefined ? {} : {file}),
              ...(spec["tests"] === undefined
                ? {}
                : {
                    tests: array(spec["tests"], "Playwright tests").map((value): PlaywrightTest => {
                      const test = record(value, "Playwright test");
                      const status = optionalText(test, "status");
                      const expectedStatus = optionalText(test, "expectedStatus");
                      const projectName = optionalText(test, "projectName");
                      return {
                        ...(status === undefined ? {} : {status}),
                        ...(expectedStatus === undefined ? {} : {expectedStatus}),
                        ...(projectName === undefined ? {} : {projectName}),
                        ...(test["results"] === undefined ? {} : {results: array(test["results"], "Playwright results").map(decodeResult)}),
                      };
                    }),
                  }),
            };
          }),
        }),
  };
}

function decodeReport(value: unknown): PlaywrightJSONReport {
  const raw = record(value, "Playwright report");
  if (raw["suites"] === undefined && raw["stats"] === undefined && raw["errors"] === undefined)
    throw new TypeError("Invalid Playwright report: missing suites/stats/errors");
  const stats = raw["stats"] === undefined ? undefined : record(raw["stats"], "Playwright stats");
  return {
    ...(raw["errors"] === undefined ? {} : {errors: array(raw["errors"], "Playwright global errors").map(decodeError)}),
    ...(raw["suites"] === undefined ? {} : {suites: array(raw["suites"], "Playwright suites").map(decodeSuite)}),
    ...(stats === undefined
      ? {}
      : {
          stats: {
            expected: count(stats["expected"] ?? 0, "Playwright expected"),
            unexpected: count(stats["unexpected"] ?? 0, "Playwright unexpected"),
            flaky: count(stats["flaky"] ?? 0, "Playwright flaky"),
            skipped: count(stats["skipped"] ?? 0, "Playwright skipped"),
            duration: finite(stats["duration"] ?? 0, "Playwright duration"),
          },
        }),
  };
}

/**
 * Interface for Playwright helper operations following Interface Segregation Principle
 */
export interface IPlaywrightHelper {
  /**
   * Parses a Playwright JSON test results file
   *
   * @param resultsJsonPath - Path to Playwright JSON results file
   * @param fs - File system helper for reading files
   * @returns Parsed test results with statistics and categorized failures
   * @throws Error if file cannot be read or parsed
   *
   * @example
   * ```typescript
   * const results = await helper.parseResults('test-results.json', fsHelper);
   * console.log(`Total tests: ${results.statistics.total}`);
   * console.log(`Failed tests: ${results.statistics.failed}`);
   * ```
   */
  parseResults(resultsJsonPath: string, fs: IFileSystemHelper): Promise<ParsedTestResults>;

  /**
   * Generates a formatted markdown section for Playwright test results
   *
   * @param results - Parsed test results from parseResults()
   * @param options - Formatting options for the markdown output
   * @returns Markdown string ready for PR comments or reports
   *
   * @example
   * ```typescript
   * const markdown = helper.generateMarkdownSection(results, {
   *   workflowRunUrl: 'https://github.com/owner/repo/actions/runs/123',
   *   includeFailureDetails: true,
   *   maxFailuresToShow: 5
   * });
   * ```
   */
  generateMarkdownSection(results: ParsedTestResults, options?: PlaywrightMarkdownOptions): string;

  /**
   * Generates a simple markdown section when no test results are available
   *
   * @param jobStatus - Job execution status (success, failure, etc.)
   * @param workflowRunUrl - URL to workflow run
   * @returns Simple markdown section with status
   *
   * @example
   * ```typescript
   * const markdown = helper.generateSimpleSection('success', workflowRunUrl);
   * ```
   */
  generateSimpleSection(jobStatus: string, workflowRunUrl: string): string;

  /**
   * Categorizes test failures by type (assertions, timeouts, other)
   *
   * @param failures - Array of failed test cases
   * @returns Categorized failures
   *
   * @example
   * ```typescript
   * const categories = helper.categorizeFailures(results.failures);
   * console.log(`Assertion failures: ${categories.assertions.length}`);
   * ```
   */
  categorizeFailures(failures: readonly TestCase[]): PlaywrightFailureCategories;
}

/**
 * Playwright helper implementation following SOLID principles
 */
export class PlaywrightHelper implements IPlaywrightHelper {
  /**
   * Parses Playwright JSON test results
   */
  async parseResults(resultsJsonPath: string, fs: IFileSystemHelper): Promise<ParsedTestResults> {
    const exists = await fs.exists(resultsJsonPath);
    if (!exists) {
      throw new Error(`Playwright results file not found: ${resultsJsonPath}`);
    }

    const rawData = await fs.readValidatedJson(resultsJsonPath, decodeReport, MAX_REPORT_BYTES);

    // Extract test cases from nested structure
    const tests = this.extractTestCases(rawData);

    // Calculate statistics
    const statistics = this.calculateStatistics(tests, rawData.stats);

    // Extract failures and flaky tests
    const failures = tests.filter((test) => test.status === "failed" || test.status === "timedOut" || test.status === "interrupted");
    const flaky = tests.filter((test) => test.status === "flaky");

    // Categorize failures
    const categories = this.categorizeFailures(failures);

    return {
      statistics,
      tests,
      failures,
      flaky,
      categories,
      errors: rawData.errors ?? [],
    };
  }

  /**
   * Generates markdown section for test results
   */
  generateMarkdownSection(results: ParsedTestResults, options: PlaywrightMarkdownOptions = {}): string {
    const {
      workflowRunUrl = "",
      includeFailureDetails = true,
      maxFailuresToShow = 10,
      includeFlakyTests = true,
      title = "🎭 Playwright Tests",
      showDuration = true,
    } = options;

    const {statistics} = results;
    const errors = results.errors ?? [];
    const emoji = errors.length > 0 ? "❌" : this.getStatusEmoji(statistics);

    let section = `### ${emoji} ${title}\n\n`;

    // Add statistics table
    section += this.generateStatisticsTable(statistics, showDuration);
    if (errors.length > 0) {
      section += `\n#### ❌ Runner Errors\n\n${errors.length} global runner error(s); assertion counters are unchanged.\n\n`;
      for (const error of errors.slice(0, maxFailuresToShow))
        section += `${MarkdownUtils.fence(redactEvidenceText(error.message), "text")}\n\n`;
      if (errors.length > maxFailuresToShow)
        section += `_... and ${errors.length - maxFailuresToShow} more runner error(s); see artifacts._\n\n`;
    }

    // Add failure details if requested
    if (includeFailureDetails && results.failures.length > 0) {
      section += `\n#### ❌ Failed Tests\n\n`;
      section += this.generateFailureSection(results.failures, results.categories, maxFailuresToShow);
    }

    // Add flaky test information if requested
    if (includeFlakyTests && results.flaky.length > 0) {
      section += `\n#### ⚠️ Flaky Tests\n\n`;
      section += this.generateFlakyTestSection(results.flaky);
    }

    // Add link to HTML report
    if (workflowRunUrl) {
      section += `\n📊 [View Full HTML Report](${workflowRunUrl}#artifacts)\n\n`;
    }

    section += `----\n`;
    return section;
  }

  /**
   * Generates simple markdown section when no results available
   */
  generateSimpleSection(jobStatus: string, workflowRunUrl: string): string {
    let statusEmoji: string;
    if (jobStatus === "success") {
      statusEmoji = "✅";
    } else if (jobStatus === "failure") {
      statusEmoji = "❌";
    } else {
      statusEmoji = "⚠️";
    }

    let testStatusMessage = "";
    if (jobStatus === "success") {
      testStatusMessage = "All Playwright tests passed!";
    } else if (jobStatus === "failure") {
      testStatusMessage = "Playwright tests failed.";
    } else {
      testStatusMessage = `Playwright tests status: ${jobStatus}.`;
    }

    let section = `### ${statusEmoji} Playwright Tests\n\n`;
    section += `${testStatusMessage} ([View Full Report](${workflowRunUrl}#artifacts))\n\n`;
    section += `----\n`;
    return section;
  }

  /**
   * Categorizes failures by type
   */
  categorizeFailures(failures: readonly TestCase[]): PlaywrightFailureCategories {
    const assertions: TestCase[] = [];
    const timeouts: TestCase[] = [];
    const other: TestCase[] = [];

    for (const failure of failures) {
      if (failure.status === "timedOut") {
        timeouts.push(failure);
      } else if (failure.error?.message.toLowerCase().includes("expect")) {
        assertions.push(failure);
      } else {
        other.push(failure);
      }
    }

    return {assertions, timeouts, other};
  }

  /**
   * Extracts test cases from raw Playwright JSON structure
   */
  private extractTestCases(rawData: PlaywrightJSONReport): TestCase[] {
    const tests: TestCase[] = [];

    if (!rawData.suites) {
      return tests;
    }

    for (const suite of rawData.suites) {
      this.extractTestsFromSuite(suite, tests, [], "unknown");
    }

    return tests;
  }

  /**
   * Extracts test cases from a single suite (extracted for cognitive complexity)
   */
  private extractTestsFromSuite(suite: PlaywrightSuite, tests: TestCase[], parents: readonly string[], inheritedFile: string): void {
    const file = suite.file ?? inheritedFile;
    const titles = suite.title ? [...parents, suite.title] : parents;
    for (const spec of suite.specs ?? []) this.extractTestsFromSpec(spec, titles.join(" › "), spec.file ?? file, tests);
    for (const child of suite.suites ?? []) this.extractTestsFromSuite(child, tests, titles, file);
  }

  /**
   * Extracts test cases from a single spec (extracted for cognitive complexity)
   */
  private extractTestsFromSpec(spec: PlaywrightSpec, suiteTitle: string | undefined, file: string, tests: TestCase[]): void {
    const title = spec.title ?? "Untitled Test";
    const fullTitle = suiteTitle ? `${suiteTitle} › ${title}` : title;

    if (!spec.tests || spec.tests.length === 0) {
      return;
    }

    for (const test of spec.tests) {
      const testCase = this.createTestCaseFromResults(test, title, fullTitle, file);
      if (testCase) {
        tests.push(testCase);
      }
    }
  }

  /**
   * Creates a TestCase from Playwright test results (extracted for cognitive complexity)
   */
  private createTestCaseFromResults(test: PlaywrightTest, title: string, fullTitle: string, file: string): TestCase | null {
    const results = test.results ?? [];
    const lastResult = results.at(-1);

    if (!lastResult) {
      return null;
    }

    const retries = results.length - 1;
    const lastStatus = this.normalizeStatus(lastResult.status ?? "skipped");

    // Determine if test is flaky: has retries and last result passed
    const hadFailures = results.slice(0, -1).some((r) => {
      const s = this.normalizeStatus(r.status ?? "failed");
      return s === "failed" || s === "timedOut" || s === "interrupted";
    });
    let status: TestStatus = retries > 0 && hadFailures && lastStatus === "passed" ? "flaky" : lastStatus;
    if (test.status === "flaky") status = "flaky";
    else if (test.status === "expected") status = lastStatus === "skipped" ? "skipped" : "passed";
    else if (test.status === "unexpected") status = lastStatus === "timedOut" || lastStatus === "interrupted" ? lastStatus : "failed";
    else if (test.expectedStatus === lastStatus && lastStatus === "failed") status = "passed";
    const duration = lastResult.duration ?? 0;

    return {
      title,
      fullTitle,
      file,
      status,
      duration,
      ...(test.projectName === undefined ? {} : {project: test.projectName}),
      retries: retries > 0 ? retries : undefined,
      error: lastResult.error,
    };
  }

  /**
   * Normalizes status string to TestStatus type
   */
  private normalizeStatus(status: string): TestStatus {
    const normalized = status.toLowerCase();

    if (normalized === "passed") return "passed";
    if (normalized === "failed") return "failed";
    if (normalized === "skipped") return "skipped";
    if (normalized === "flaky") return "flaky";
    if (normalized === "timedout") return "timedOut";
    if (normalized === "interrupted") return "interrupted";

    return "failed"; // Default to failed for unknown statuses
  }

  /**
   * Calculates test statistics
   */
  private calculateStatistics(tests: TestCase[], statsFromReport?: PlaywrightJSONReport["stats"]): TestStatistics {
    // Prefer stats from report if available
    if (statsFromReport) {
      const passed = statsFromReport.expected ?? 0;
      const failed = statsFromReport.unexpected ?? 0;
      const flaky = statsFromReport.flaky ?? 0;
      const skipped = statsFromReport.skipped ?? 0;
      const total = passed + failed + flaky + skipped;

      return {
        total,
        passed,
        failed,
        skipped,
        flaky,
        duration: statsFromReport.duration ?? 0,
      };
    }

    // Calculate from test cases
    const passed = tests.filter((t) => t.status === "passed").length;
    const failed = tests.filter((t) => t.status === "failed" || t.status === "timedOut" || t.status === "interrupted").length;
    const skipped = tests.filter((t) => t.status === "skipped").length;
    const flaky = tests.filter((t) => t.status === "flaky").length;
    const duration = tests.reduce((sum, test) => sum + test.duration, 0);

    return {
      total: tests.length,
      passed,
      failed,
      skipped,
      flaky,
      duration,
    };
  }

  /**
   * Gets status emoji based on statistics
   */
  private getStatusEmoji(statistics: TestStatistics): string {
    if (statistics.failed > 0) {
      return "❌";
    }

    if (statistics.flaky > 0) {
      return "⚠️";
    }

    return "✅";
  }

  /**
   * Generates statistics table
   */
  private generateStatisticsTable(statistics: TestStatistics, showDuration: boolean): string {
    let table = `| Status | Count |\n`;
    table += `|--------|-------|\n`;
    table += `| ✅ Passed | ${statistics.passed} |\n`;
    table += `| ❌ Failed | ${statistics.failed} |\n`;
    table += `| ⏭️ Skipped | ${statistics.skipped} |\n`;

    if (statistics.flaky > 0) {
      table += `| ⚠️ Flaky | ${statistics.flaky} |\n`;
    }

    table += `| **Total** | **${statistics.total}** |\n`;

    if (showDuration) {
      const durationSeconds = (statistics.duration / 1000).toFixed(2);
      table += `| ⏱️ Duration | ${durationSeconds}s |\n`;
    }

    table += `\n`;
    return table;
  }

  /**
   * Generates failure section with details
   */
  private generateFailureSection(failures: readonly TestCase[], categories: PlaywrightFailureCategories, maxToShow: number): string {
    let section = "";

    // Show categorized summary
    if (categories.assertions.length > 0) {
      section += `**Assertion Failures:** ${categories.assertions.length}\n`;
    }

    if (categories.timeouts.length > 0) {
      section += `**Timeouts:** ${categories.timeouts.length}\n`;
    }

    if (categories.other.length > 0) {
      section += `**Other Failures:** ${categories.other.length}\n`;
    }

    section += `\n`;

    // Show detailed failures
    const failuresToShow = failures.slice(0, maxToShow);

    for (const failure of failuresToShow) {
      section += `**${failure.fullTitle}**\n`;
      section += `- File: \`${failure.file}\`\n`;
      section += `- Status: ${this.getStatusBadge(failure.status)}\n`;
      section += `- Duration: ${(failure.duration / 1000).toFixed(2)}s\n`;

      if (failure.error) {
        section += `- Error: \`${failure.error.message.split("\n")[0]}\`\n`;
      }

      if (failure.retries && failure.retries > 0) {
        section += `- Retries: ${failure.retries}\n`;
      }

      section += `\n`;
    }

    if (failures.length > maxToShow) {
      const remaining = failures.length - maxToShow;
      section += `_... and ${remaining} more ${remaining === 1 ? "failure" : "failures"}_\n\n`;
    }

    return section;
  }

  /**
   * Generates flaky test section
   */
  private generateFlakyTestSection(flakyTests: readonly TestCase[]): string {
    let section = `These tests passed after retry:\n\n`;

    for (const test of flakyTests) {
      section += `- **${test.fullTitle}** (retried ${test.retries ?? 0} ${test.retries === 1 ? "time" : "times"})\n`;
    }

    section += `\n`;
    return section;
  }

  /**
   * Gets status badge emoji
   */
  private getStatusBadge(status: TestStatus): string {
    switch (status) {
      case "passed":
        return "✅ Passed";
      case "failed":
        return "❌ Failed";
      case "timedOut":
        return "⏱️ Timed Out";
      case "skipped":
        return "⏭️ Skipped";
      case "flaky":
        return "⚠️ Flaky";
      case "interrupted":
        return "⚠️ Interrupted";
      default:
        return "❓ Unknown";
    }
  }
}

/**
 * Factory function to create a new PlaywrightHelper instance
 * @returns A new PlaywrightHelper instance
 */
export function createPlaywrightHelper(): IPlaywrightHelper {
  return new PlaywrightHelper();
}

/**
 * Default playwright helper instance for convenience
 */
export const playwright: IPlaywrightHelper = createPlaywrightHelper();

/**
 * Convenience function: Parse Playwright test results
 * @param resultsJsonPath - Path to test results JSON
 * @param fs - File system helper
 * @returns Parsed test results
 */
export async function parsePlaywrightResults(resultsJsonPath: string, fs: IFileSystemHelper): Promise<ParsedTestResults> {
  return playwright.parseResults(resultsJsonPath, fs);
}

/**
 * Convenience function: Generate markdown section for Playwright results
 * @param results - Parsed test results
 * @param options - Markdown formatting options
 * @returns Formatted markdown string
 */
export function generatePlaywrightMarkdownSection(results: ParsedTestResults, options?: PlaywrightMarkdownOptions): string {
  return playwright.generateMarkdownSection(results, options);
}

/**
 * Convenience function: Generate simple markdown section
 * @param jobStatus - Job execution status
 * @param workflowRunUrl - URL to workflow run
 * @returns Simple markdown section
 */
export function generateSimplePlaywrightSection(jobStatus: string, workflowRunUrl: string): string {
  return playwright.generateSimpleSection(jobStatus, workflowRunUrl);
}

/**
 * Convenience function: Categorize test failures
 * @param failures - Array of failed tests
 * @returns Categorized failures
 */
export function categorizePlaywrightFailures(failures: readonly TestCase[]): PlaywrightFailureCategories {
  return playwright.categorizeFailures(failures);
}
