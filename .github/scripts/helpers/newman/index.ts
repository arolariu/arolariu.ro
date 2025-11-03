/**
 * @fileoverview Newman test report parser for E2E test analysis
 * @module helpers/newman
 *
 * Provides clean, type-safe API for parsing and analyzing Newman test reports.
 * Follows Single Responsibility Principle by focusing solely on Newman report processing.
 *
 * Key Features:
 * - Parses Newman JSON reports to extract execution statistics
 * - Categorizes failures by type (client errors, server errors, timeouts, etc.)
 * - Generates detailed markdown reports for GitHub issues
 * - Provides pure functions for easy testing and composition
 *
 * @example
 * ```typescript
 * import {parseNewmanReport, categorizeFailures, generateNewmanResultsSection} from './helpers/newman';
 *
 * const report = JSON.parse(await readFile('newman-report.json'));
 * const stats = parseNewmanReport(report);
 * const categories = categorizeFailures(stats);
 * const markdown = generateNewmanResultsSection(stats, 'Backend API');
 * ```
 */

// ============================================================================
// NEWMAN TYPE DEFINITIONS
// ============================================================================

/**
 * Newman report structure from JSON output
 */
export interface NewmanReport {
  readonly collection: {
    readonly info: {
      readonly name: string;
      readonly description?: string;
      readonly schema: string;
    };
  };
  readonly run: {
    readonly stats: {
      readonly requests: {
        readonly total: number;
        readonly failed: number;
      };
      readonly assertions: {
        readonly total: number;
        readonly failed: number;
      };
    };
    readonly timings: {
      readonly started: number; // Unix timestamp
      readonly completed: number; // Unix timestamp
      readonly responseAverage: number;
      readonly responseMin: number;
      readonly responseMax: number;
    };
    readonly executions: readonly NewmanExecution[];
  };
}

/**
 * Individual test execution within Newman run
 */
export interface NewmanExecution {
  readonly item: {
    readonly name: string;
    readonly id?: string;
  };
  readonly request: {
    readonly method: string;
    readonly url: {
      readonly raw: string;
      readonly protocol: string;
      readonly host: readonly string[];
      readonly path: readonly string[];
      toString(): string;
    };
    readonly header?: ReadonlyArray<{readonly key: string; readonly value: string}>;
  };
  readonly response?: {
    readonly code: number;
    readonly status: string;
    readonly responseTime: number;
    readonly responseSize?: number;
    readonly stream?: Uint8Array;
    readonly header?: ReadonlyArray<{readonly key: string; readonly value: string}>;
  };
  readonly assertions?: ReadonlyArray<{
    readonly assertion: string;
    readonly error?: {
      readonly name?: string;
      readonly message?: string;
      toString(): string;
    };
  }>;
}

/**
 * Parsed Newman execution statistics
 */
export interface NewmanExecutionStats {
  readonly collectionName: string;
  readonly totalRequests: number;
  readonly failedRequests: number;
  readonly successRate: number; // Percentage
  readonly totalAssertions: number;
  readonly failedAssertions: number;
  readonly assertionSuccessRate: number; // Percentage
  readonly timings: NewmanTimings;
  readonly failures: readonly NewmanFailedRequest[];
}

/**
 * Timing statistics from Newman run
 */
export interface NewmanTimings {
  readonly started: string; // ISO timestamp
  readonly completed: string; // ISO timestamp
  readonly totalDuration: number; // milliseconds
  readonly responseTimeMin: number; // milliseconds
  readonly responseTimeMax: number; // milliseconds
  readonly responseTimeAvg: number; // milliseconds
}

/**
 * Details of a failed request
 */
export interface NewmanFailedRequest {
  readonly name: string;
  readonly method: string;
  readonly url: string;
  readonly statusCode: number;
  readonly responseTime: number;
  readonly failedAssertions: ReadonlyArray<{
    readonly assertion: string;
    readonly error: string;
  }>;
  readonly responseBody?: string;
}

// ============================================================================
// HELPER-SPECIFIC TYPES
// ============================================================================

/**
 * Failure categories for Newman test failures
 */
export interface FailureCategories {
  /** Client errors (4xx status codes) */
  clientErrors: number;
  /** Server errors (5xx status codes) */
  serverErrors: number;
  /** Timeout errors */
  timeouts: number;
  /** Assertion failures (non-status related) */
  assertionFailures: number;
  /** Other uncategorized failures */
  other: number;
}

/**
 * Options for generating markdown sections
 */
export interface MarkdownOptions {
  /** Include performance metrics section */
  includePerformance?: boolean;
  /** Include failure details */
  includeFailureDetails?: boolean;
  /** Maximum characters to show in response body */
  maxResponseBodyLength?: number;
}

/**
 * Newman parser helper interface
 */
export interface INewmanHelper {
  /**
   * Parses a Newman JSON report to extract execution statistics
   * @param reportData - Raw Newman report object from JSON file
   * @returns Structured execution statistics including timings, assertions, and failures
   * @throws {Error} If report data is malformed or missing required fields
   */
  parseReport(reportData: NewmanReport): NewmanExecutionStats;

  /**
   * Categorizes failures by type for better analysis
   * @param stats - Parsed Newman execution statistics
   * @returns Object with categorized failure counts
   */
  categorizeFailures(stats: NewmanExecutionStats): FailureCategories;

  /**
   * Generates a detailed markdown section for Newman test results
   * @param stats - Parsed Newman execution statistics
   * @param testType - Type of test (e.g., 'Frontend', 'Backend')
   * @param options - Optional markdown generation options
   * @returns Formatted markdown section with test results and failure details
   */
  generateMarkdownSection(stats: NewmanExecutionStats, testType: string, options?: MarkdownOptions): string;
}

/**
 * Implementation of Newman helper
 */
export class NewmanHelper implements INewmanHelper {
  /**
   * {@inheritDoc INewmanHelper.parseReport}
   */
  parseReport(reportData: NewmanReport): NewmanExecutionStats {
    const run = reportData.run;
    const stats = run.stats;
    const timings = run.timings;

    // Extract basic statistics
    const totalRequests = stats.requests.total;
    const failedRequests = stats.requests.failed;
    const totalAssertions = stats.assertions.total;
    const failedAssertions = stats.assertions.failed;

    // Calculate success rates
    const successRate = totalRequests > 0 ? ((totalRequests - failedRequests) / totalRequests) * 100 : 0;
    const assertionSuccessRate = totalAssertions > 0 ? ((totalAssertions - failedAssertions) / totalAssertions) * 100 : 0;

    // Calculate timing statistics (convert to milliseconds)
    const responseTimeMin = timings.responseAverage > 0 ? Math.round(timings.responseMin) : 0;
    const responseTimeMax = timings.responseMax > 0 ? Math.round(timings.responseMax) : 0;
    const responseTimeAvg = timings.responseAverage > 0 ? Math.round(timings.responseAverage) : 0;
    const totalDuration = Math.round(timings.completed - timings.started);

    // Extract failed requests with details
    const failures = this.extractFailedRequests(run.executions);

    return {
      collectionName: reportData.collection.info.name,
      totalRequests,
      failedRequests,
      successRate,
      totalAssertions,
      failedAssertions,
      assertionSuccessRate,
      timings: {
        started: new Date(timings.started).toISOString(),
        completed: new Date(timings.completed).toISOString(),
        totalDuration,
        responseTimeMin,
        responseTimeMax,
        responseTimeAvg,
      },
      failures,
    };
  }

  /**
   * {@inheritDoc INewmanHelper.categorizeFailures}
   */
  categorizeFailures(stats: NewmanExecutionStats): FailureCategories {
    const categories: FailureCategories = {
      clientErrors: 0,
      serverErrors: 0,
      timeouts: 0,
      assertionFailures: 0,
      other: 0,
    };

    for (const failure of stats.failures) {
      if (failure.statusCode >= 400 && failure.statusCode < 500) {
        categories.clientErrors++;
      } else if (failure.statusCode >= 500) {
        categories.serverErrors++;
      } else if (failure.failedAssertions.some((a) => a.error.toLowerCase().includes("timeout"))) {
        categories.timeouts++;
      } else if (failure.failedAssertions.length > 0) {
        categories.assertionFailures++;
      } else {
        categories.other++;
      }
    }

    return categories;
  }

  /**
   * {@inheritDoc INewmanHelper.generateMarkdownSection}
   */
  generateMarkdownSection(stats: NewmanExecutionStats, testType: string, options: MarkdownOptions = {}): string {
    const {includePerformance = true, includeFailureDetails = true, maxResponseBodyLength = 500} = options;

    let markdown = `\n## 📊 ${testType} Newman Test Results\n\n`;

    // Overall statistics
    markdown += this.generateSummaryTable(stats);

    // Performance metrics
    if (includePerformance) {
      markdown += this.generatePerformanceTable(stats);
    }

    // Failed requests details
    if (includeFailureDetails && stats.failures.length > 0) {
      markdown += this.generateFailureSection(stats.failures, maxResponseBodyLength);
    } else if (stats.failures.length === 0) {
      markdown += "### ✅ All Requests Passed\n\n";
      markdown += "No failed requests detected.\n\n";
    }

    return markdown;
  }

  /**
   * Extracts failed requests from Newman executions
   * @param executions - Array of Newman executions
   * @returns Array of failed request details
   */
  private extractFailedRequests(executions: NewmanReport["run"]["executions"]): NewmanFailedRequest[] {
    const failures: NewmanFailedRequest[] = [];

    for (const execution of executions) {
      const item = execution.item;
      const request = execution.request;
      const response = execution.response;

      // Check if this execution has failures
      const hasFailedAssertions = execution.assertions?.some((assertion) => assertion.error !== undefined) ?? false;
      const hasResponseError = response?.code !== undefined && response.code >= 400;

      if (hasFailedAssertions || hasResponseError) {
        const failedAssertions = execution.assertions?.filter((assertion) => assertion.error !== undefined) ?? [];
        const responseBody = response?.stream ? Buffer.from(response.stream).toString("utf-8").substring(0, 500) : "";

        // Extract URL - use raw string if available, otherwise construct from parts
        const urlString = request.url.raw || `${request.url.protocol}://${request.url.host.join(".")}/${request.url.path.join("/")}`;

        failures.push({
          name: item.name,
          method: request.method,
          url: urlString,
          statusCode: response?.code ?? 0,
          responseTime: response?.responseTime ?? 0,
          failedAssertions: failedAssertions.map((assertion) => ({
            assertion: assertion.assertion ?? "Unknown assertion",
            error: assertion.error?.message ?? assertion.error?.toString() ?? "Unknown error",
          })),
          responseBody,
        });
      }
    }

    return failures;
  }

  /**
   * Generates the summary table section
   * @param stats - Newman execution statistics
   * @returns Markdown table with summary statistics
   */
  private generateSummaryTable(stats: NewmanExecutionStats): string {
    let table = "### Test Execution Summary\n\n";
    table += "| Metric | Value |\n";
    table += "|--------|-------|\n";
    table += `| Collection | \`${stats.collectionName}\` |\n`;
    table += `| Total Requests | ${stats.totalRequests} |\n`;

    const failedRequestsDisplay = stats.failedRequests > 0 ? `**${stats.failedRequests}** ❌` : `${stats.failedRequests} ✅`;
    table += `| Failed Requests | ${failedRequestsDisplay} |\n`;
    table += `| Success Rate | **${stats.successRate.toFixed(2)}%** |\n`;
    table += `| Total Assertions | ${stats.totalAssertions} |\n`;

    const failedAssertionsDisplay = stats.failedAssertions > 0 ? `**${stats.failedAssertions}** ❌` : `${stats.failedAssertions} ✅`;
    table += `| Failed Assertions | ${failedAssertionsDisplay} |\n`;
    table += `| Assertion Success Rate | **${stats.assertionSuccessRate.toFixed(2)}%** |\n`;
    table += `| Total Duration | \`${(stats.timings.totalDuration / 1000).toFixed(2)}s\` |\n`;
    table += "\n";

    return table;
  }

  /**
   * Generates the performance metrics table
   * @param stats - Newman execution statistics
   * @returns Markdown table with performance metrics
   */
  private generatePerformanceTable(stats: NewmanExecutionStats): string {
    let table = "### ⏱️ Performance Metrics\n\n";
    table += "| Metric | Value |\n";
    table += "|--------|-------|\n";
    table += `| Response Time (Min) | \`${stats.timings.responseTimeMin}ms\` |\n`;
    table += `| Response Time (Avg) | **\`${stats.timings.responseTimeAvg}ms\`** |\n`;
    table += `| Response Time (Max) | \`${stats.timings.responseTimeMax}ms\` |\n`;
    table += "\n";

    return table;
  }

  /**
   * Generates the failure section with details
   * @param failures - Array of failed requests
   * @param maxResponseBodyLength - Maximum length for response body
   * @returns Markdown section with failure details
   */
  private generateFailureSection(failures: readonly NewmanFailedRequest[], maxResponseBodyLength: number): string {
    let section = "### ❌ Failed Requests\n\n";

    for (const [index, failure] of failures.entries()) {
      section += this.generateFailedRequestMarkdown(failure, index + 1, maxResponseBodyLength);
    }

    return section;
  }

  /**
   * Generates markdown for a single failed request
   * @param failure - Failed request details
   * @param index - Request index (1-based)
   * @param maxResponseBodyLength - Maximum length for response body
   * @returns Formatted markdown for the failed request
   */
  private generateFailedRequestMarkdown(failure: NewmanFailedRequest, index: number, maxResponseBodyLength: number): string {
    let markdown = `<details>\n`;
    markdown += `<summary><strong>${index}. ${failure.name}</strong> - ${failure.method} ${failure.statusCode} (${failure.responseTime}ms)</summary>\n\n`;

    markdown += "**Request Details:**\n\n";
    markdown += `- **Method:** \`${failure.method}\`\n`;
    markdown += `- **URL:** \`${failure.url}\`\n`;

    // Add status emoji
    let statusEmoji = "";
    if (failure.statusCode >= 500) {
      statusEmoji = "🔴";
    } else if (failure.statusCode >= 400) {
      statusEmoji = "🟠";
    }
    markdown += `- **Status Code:** \`${failure.statusCode}\` ${statusEmoji}\n`;
    markdown += `- **Response Time:** \`${failure.responseTime}ms\`\n\n`;

    // Add failed assertions
    if (failure.failedAssertions.length > 0) {
      markdown += "**Failed Assertions:**\n\n";
      for (const assertion of failure.failedAssertions) {
        markdown += `- ❌ **${assertion.assertion}**\n`;
        markdown += `  \`\`\`\n  ${assertion.error}\n  \`\`\`\n`;
      }
      markdown += "\n";
    }

    // Add response body if available
    if (failure.responseBody?.trim()) {
      const truncatedBody =
        failure.responseBody.length > maxResponseBodyLength
          ? failure.responseBody.substring(0, maxResponseBodyLength) + "\n... (truncated)"
          : failure.responseBody;

      markdown += "<details>\n";
      markdown += `<summary>Response Body (${failure.responseBody.length > maxResponseBodyLength ? "truncated" : "full"})</summary>\n\n`;
      markdown += "```\n";
      markdown += truncatedBody;
      markdown += "\n```\n";
      markdown += "</details>\n\n";
    }

    markdown += `</details>\n\n`;
    return markdown;
  }
}

/**
 * Creates a new instance of the Newman helper
 * @returns Newman helper instance
 * @example
 * ```typescript
 * const newman = createNewmanHelper();
 * const stats = newman.parseReport(report);
 * const categories = newman.categorizeFailures(stats);
 * ```
 */
export function createNewmanHelper(): INewmanHelper {
  return new NewmanHelper();
}

/**
 * Default Newman helper instance
 * Exported for convenience - can be used directly without creating an instance
 */
export const newman = createNewmanHelper();

// Convenience exports for common operations
export const parseNewmanReport = (reportData: NewmanReport): NewmanExecutionStats => newman.parseReport(reportData);
export const categorizeFailures = (stats: NewmanExecutionStats): FailureCategories => newman.categorizeFailures(stats);
export const generateNewmanResultsSection = (stats: NewmanExecutionStats, testType: string, options?: MarkdownOptions): string =>
  newman.generateMarkdownSection(stats, testType, options);
