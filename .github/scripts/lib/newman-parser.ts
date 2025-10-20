/**
 * @fileoverview Newman test report parser for detailed E2E test analysis
 * @module lib/newman-parser
 */

import type {NewmanExecutionStats, NewmanFailedRequest, NewmanReport} from "../types/newman-types.ts";

/**
 * Parses a Newman JSON report to extract execution statistics and failure details
 * @param reportData - Raw Newman report object from JSON file
 * @returns Structured execution statistics including timings, assertions, and failures
 * @throws {Error} If report data is malformed or missing required fields
 * @example
 * ```typescript
 * const report = JSON.parse(await readFile('newman-report.json'));
 * const stats = parseNewmanReport(report);
 * console.log(`${stats.totalRequests} requests, ${stats.failedRequests} failed`);
 * ```
 */
export function parseNewmanReport(reportData: NewmanReport): NewmanExecutionStats {
  const run = reportData.run;
  const stats = run.stats;
  const timings = run.timings;

  // Extract basic statistics
  const totalRequests = stats.requests.total;
  const failedRequests = stats.requests.failed;
  const totalAssertions = stats.assertions.total;
  const failedAssertions = stats.assertions.failed;

  // Calculate timing statistics (convert to milliseconds)
  const responseTimeMin = timings.responseAverage > 0 ? Math.round(timings.responseMin) : 0;
  const responseTimeMax = timings.responseMax > 0 ? Math.round(timings.responseMax) : 0;
  const responseTimeAvg = timings.responseAverage > 0 ? Math.round(timings.responseAverage) : 0;
  const totalDuration = Math.round(timings.completed - timings.started);

  // Extract failed requests with details
  const failedRequestDetails: NewmanFailedRequest[] = [];

  for (const execution of run.executions) {
    const item = execution.item;
    const request = execution.request;
    const response = execution.response;

    // Check if this execution has failures
    const hasFailedAssertions = execution.assertions?.some((assertion) => assertion.error !== undefined) ?? false;
    const hasResponseError = response?.code !== undefined && response.code >= 400;

    if (hasFailedAssertions || hasResponseError) {
      const failedAssertions = execution.assertions?.filter((assertion) => assertion.error !== undefined) ?? [];
      const responseBody = response?.stream ? Buffer.from(response.stream).toString("utf-8").substring(0, 500) : "";

      failedRequestDetails.push({
        name: item.name,
        method: request.method,
        url: request.url.toString(),
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

  return {
    collectionName: reportData.collection.info.name,
    totalRequests,
    failedRequests,
    successRate: totalRequests > 0 ? ((totalRequests - failedRequests) / totalRequests) * 100 : 0,
    totalAssertions,
    failedAssertions,
    assertionSuccessRate: totalAssertions > 0 ? ((totalAssertions - failedAssertions) / totalAssertions) * 100 : 0,
    timings: {
      started: new Date(timings.started).toISOString(),
      completed: new Date(timings.completed).toISOString(),
      totalDuration,
      responseTimeMin,
      responseTimeMax,
      responseTimeAvg,
    },
    failures: failedRequestDetails,
  };
}

/**
 * Generates a detailed markdown section for Newman test results
 * @param stats - Parsed Newman execution statistics
 * @param testType - Type of test (e.g., 'Frontend', 'Backend')
 * @returns Formatted markdown section with test results and failure details
 * @example
 * ```typescript
 * const markdown = generateNewmanResultsSection(stats, 'Backend API');
 * // Returns formatted markdown with tables and failure details
 * ```
 */
export function generateNewmanResultsSection(stats: NewmanExecutionStats, testType: string): string {
  let markdown = `\n### 📊 ${testType} Newman Test Results\n\n`;

  // Overall statistics
  markdown += "**Test Execution Summary:**\n\n";
  markdown += "| Metric | Value |\n";
  markdown += "|--------|-------|\n";
  markdown += `| Collection | ${stats.collectionName} |\n`;
  markdown += `| Total Requests | ${stats.totalRequests} |\n`;
  markdown += `| Failed Requests | **${stats.failedRequests}** |\n`;
  markdown += `| Success Rate | ${stats.successRate.toFixed(2)}% |\n`;
  markdown += `| Total Assertions | ${stats.totalAssertions} |\n`;
  markdown += `| Failed Assertions | **${stats.failedAssertions}** |\n`;
  markdown += `| Assertion Success Rate | ${stats.assertionSuccessRate.toFixed(2)}% |\n`;
  markdown += `| Total Duration | ${(stats.timings.totalDuration / 1000).toFixed(2)}s |\n`;
  markdown += "\n";

  // Performance metrics
  markdown += "**Performance Metrics:**\n\n";
  markdown += "| Metric | Value (ms) |\n";
  markdown += "|--------|------------|\n";
  markdown += `| Response Time (Min) | ${stats.timings.responseTimeMin} |\n`;
  markdown += `| Response Time (Avg) | **${stats.timings.responseTimeAvg}** |\n`;
  markdown += `| Response Time (Max) | ${stats.timings.responseTimeMax} |\n`;
  markdown += "\n";

  // Failed requests details
  if (stats.failures.length > 0) {
    markdown += "**❌ Failed Requests:**\n\n";

    for (const [index, failure] of stats.failures.entries()) {
      markdown += `#### ${index + 1}. ${failure.name}\n\n`;
      markdown += `- **Method:** \`${failure.method}\`\n`;
      markdown += `- **URL:** \`${failure.url}\`\n`;
      markdown += `- **Status Code:** \`${failure.statusCode}\`\n`;
      markdown += `- **Response Time:** ${failure.responseTime}ms\n`;

      if (failure.failedAssertions.length > 0) {
        markdown += "\n**Failed Assertions:**\n\n";
        for (const assertion of failure.failedAssertions) {
          markdown += `- ❌ **${assertion.assertion}**\n`;
          markdown += `  \`\`\`\n  ${assertion.error}\n  \`\`\`\n`;
        }
      }

      if (failure.responseBody) {
        markdown += "\n**Response Body (truncated):**\n\n";
        markdown += "```\n";
        markdown += failure.responseBody;
        markdown += "\n```\n";
      }

      markdown += "\n---\n\n";
    }
  }

  return markdown;
}

/**
 * Categorizes failures by type for better understanding
 * @param stats - Parsed Newman execution statistics
 * @returns Object with categorized failure counts
 * @example
 * ```typescript
 * const categories = categorizeFailures(stats);
 * console.log(`${categories.timeouts} timeout errors`);
 * ```
 */
export function categorizeFailures(stats: NewmanExecutionStats): {
  clientErrors: number; // 4xx
  serverErrors: number; // 5xx
  timeouts: number;
  assertionFailures: number;
  other: number;
} {
  const categories = {
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
