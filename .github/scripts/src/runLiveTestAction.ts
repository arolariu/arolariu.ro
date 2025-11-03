/**
 * @fileoverview Unified live test (E2E) action script for GitHub Actions workflows
 * @module src/runLiveTestAction
 *
 * This module handles all live/E2E test failure tracking and reporting:
 * - **Test Result Extraction**: Gathers frontend and backend test execution results
 * - **Artifact Discovery**: Finds and parses Newman reports, logs, and health checks
 * - **Failure Analysis**: Categorizes failures by type (client errors, server errors, timeouts, etc.)
 * - **Issue Creation**: Creates comprehensive GitHub issues for test failures with detailed diagnostics
 * - **Duplicate Prevention**: Checks for existing issues to avoid duplicates
 *
 * The script automatically discovers test artifacts, analyzes Newman test reports, and generates
 * detailed failure reports that include health check data, log tails, and categorized error analysis.
 *
 * @example
 * ```typescript
 * // Called from GitHub Actions workflow
 * const { default: runLiveTestAction } = await import('./runLiveTestAction.ts');
 * await runLiveTestAction();
 * ```
 */

import {basename} from "node:path";
import {fs} from "../helpers/index.ts";
import type {NewmanExecutionStats, NewmanFailedRequest, NewmanReport} from "../types/newman-types.ts";
import type {BackendHealthCheck, E2ETestResults, TestArtifactPaths, WorkflowMetadata} from "../types/workflow-types.ts";

/**
 * Constants
 */
const DEFAULT_LOG_TAIL_LENGTH = 50;
const DEFAULT_GITHUB_SERVER_URL = "https://github.com";
const DEFAULT_ARTIFACTS_DIR = "logs";
const HEALTH_CHECK_FILENAME = "backend-health.json";
const AUTOMATED_TEST_FAILURE_LABELS: string[] = ["bug", "automated-test-failure"];

const STATUS_EMOJI = {
  success: "✅",
  failure: "❌",
  cancelled: "⚠️",
  skipped: "⚠️",
  unknown: "⚠️",
} as const;

/**
 * Discovers test artifacts in the specified directory
 * @param baseDir - Base directory to search for artifacts
 * @returns Object containing paths to discovered artifacts
 */
async function discoverTestArtifacts(baseDir: string): Promise<TestArtifactPaths> {
  const artifacts: TestArtifactPaths = {
    logs: [],
    reports: [],
    summaries: [],
  };

  try {
    const exists = await fs.exists(baseDir);
    if (!exists) {
      return artifacts;
    }

    const files = await fs.list(baseDir);

    for (const file of files) {
      const filePath = `${baseDir}/${file}`;

      if (file.endsWith(".log")) {
        artifacts.logs?.push(filePath);
      } else if (file.endsWith(".json") && file.includes("newman")) {
        artifacts.reports?.push(filePath);
      } else if (file.endsWith(".md") && file.includes("summary")) {
        artifacts.summaries?.push(filePath);
      } else if (file === HEALTH_CHECK_FILENAME) {
        artifacts.healthCheck = filePath;
      }
    }
  } catch (error) {
    console.warn(`Failed to discover artifacts in ${baseDir}:`, error);
  }

  return artifacts;
}

/**
 * Parses a Newman JSON report to extract execution statistics
 * @param reportData - Raw Newman report object
 * @returns Structured execution statistics
 */
function parseNewmanReport(reportData: NewmanReport): NewmanExecutionStats {
  const run = reportData.run;
  const stats = run.stats;
  const timings = run.timings;

  const totalRequests = stats.requests.total;
  const failedRequests = stats.requests.failed;
  const successRate = totalRequests > 0 ? ((totalRequests - failedRequests) / totalRequests) * 100 : 0;

  const totalAssertions = stats.assertions.total;
  const failedAssertions = stats.assertions.failed;
  const assertionSuccessRate = totalAssertions > 0 ? ((totalAssertions - failedAssertions) / totalAssertions) * 100 : 0;

  const responseTimeMin = timings.responseAverage > 0 ? Math.round(timings.responseMin) : 0;
  const responseTimeMax = timings.responseMax > 0 ? Math.round(timings.responseMax) : 0;
  const responseTimeAvg = timings.responseAverage > 0 ? Math.round(timings.responseAverage) : 0;
  const totalDuration = Math.round(timings.completed - timings.started);

  const failures: NewmanFailedRequest[] = [];

  for (const execution of run.executions) {
    const item = execution.item;
    const request = execution.request;
    const response = execution.response;

    const hasFailedAssertions = execution.assertions?.some((assertion) => assertion.error !== undefined) ?? false;
    const hasResponseError = response?.code !== undefined && response.code >= 400;

    if (hasFailedAssertions || hasResponseError) {
      const failedAssertionsList = execution.assertions?.filter((assertion) => assertion.error !== undefined) ?? [];

      failures.push({
        name: item.name,
        method: request.method,
        url: request.url?.toString() ?? "Unknown URL",
        statusCode: response?.code ?? 0,
        responseTime: response?.responseTime ?? 0,
        failedAssertions: failedAssertionsList.map((assertion) => ({
          assertion: assertion.assertion,
          error: assertion.error?.message ?? "Unknown error",
        })),
      });
    }
  }

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
 * Categorizes Newman test failures by type
 * @param stats - Newman execution statistics
 * @returns Categorized failure counts
 */
function categorizeFailures(stats: NewmanExecutionStats) {
  let clientErrors = 0;
  let serverErrors = 0;
  let timeouts = 0;
  let assertionFailures = 0;
  let other = 0;

  for (const failure of stats.failures) {
    if (failure.statusCode === 0 || failure.statusCode === undefined) {
      timeouts++;
    } else if (failure.statusCode >= 400 && failure.statusCode < 500) {
      clientErrors++;
    } else if (failure.statusCode >= 500) {
      serverErrors++;
    } else if (failure.failedAssertions.length > 0) {
      assertionFailures++;
    } else {
      other++;
    }
  }

  return {clientErrors, serverErrors, timeouts, assertionFailures, other};
}

/**
 * Generates markdown section for Newman test results
 * @param stats - Newman execution statistics
 * @param testType - Type of test (Frontend/Backend)
 * @returns Markdown formatted Newman results section
 */
function generateNewmanResultsSection(stats: NewmanExecutionStats, testType: string): string {
  let section = `\n## 📊 ${testType} Newman Test Results\n\n`;
  section += `| Metric | Value |\n`;
  section += `|--------|-------|\n`;
  section += `| Total Requests | ${stats.totalRequests} |\n`;
  section += `| Failed Requests | ${stats.failedRequests} |\n`;
  section += `| Success Rate | ${stats.successRate.toFixed(2)}% |\n`;
  section += `| Total Assertions | ${stats.totalAssertions} |\n`;
  section += `| Failed Assertions | ${stats.failedAssertions} |\n`;
  section += `| Assertion Success Rate | ${stats.assertionSuccessRate.toFixed(2)}% |\n`;
  section += `| Response Time (min/avg/max) | ${stats.timings.responseTimeMin}ms / ${stats.timings.responseTimeAvg}ms / ${stats.timings.responseTimeMax}ms |\n`;
  section += `| Total Duration | ${stats.timings.totalDuration}ms |\n\n`;

  if (stats.failures.length > 0) {
    section += `### Failed Requests\n\n`;
    for (const failure of stats.failures) {
      section += `- **${failure.method} ${failure.name}**\n`;
      section += `  - URL: \`${failure.url}\`\n`;
      section += `  - Status: ${failure.statusCode === 0 ? "Timeout" : failure.statusCode}\n`;
      section += `  - Response Time: ${failure.responseTime}ms\n`;
      if (failure.failedAssertions.length > 0) {
        section += `  - Failed Assertions:\n`;
        for (const assertion of failure.failedAssertions) {
          section += `    - ${assertion.assertion}: ${assertion.error}\n`;
        }
      }
      section += `\n`;
    }
  }

  return section;
}

/**
 * Markdown builder functions
 */
function generateIssueHeader(metadata: WorkflowMetadata): string {
  const {name, runId, runNumber, eventName, serverUrl, repository, executionDate} = metadata;
  const workflowUrl = `${serverUrl}/${repository}/actions/runs/${runId}`;

  let markdown = `## 🚨 Live Test Failure Report\n\n`;
  markdown += `**Workflow:** \`${name}\`\n`;
  markdown += `**Run ID:** [${runId}](${workflowUrl})\n`;
  markdown += `**Run Number:** \`${runNumber}\`\n`;
  markdown += `**Triggered By:** \`${eventName}\`\n`;
  markdown += `**Execution Time (UTC):** \`${executionDate}\`\n\n`;
  markdown += `---\n\n`;

  return markdown;
}

function generateJobStatusTable(results: E2ETestResults): string {
  const frontendEmoji = STATUS_EMOJI[results.frontend.status];
  const backendEmoji = STATUS_EMOJI[results.backend.status];

  let table = `## 📋 Job Status\n\n`;
  table += `| Job | Status | Duration |\n`;
  table += `|-----|--------|----------|\n`;
  table += `| Frontend Tests | ${frontendEmoji} ${results.frontend.status} | ${results.frontend.duration} |\n`;
  table += `| Backend Tests | ${backendEmoji} ${results.backend.status} | ${results.backend.duration} |\n\n`;
  table += `---\n\n`;

  return table;
}

function generateHealthCheckSection(healthCheck: BackendHealthCheck | string): string {
  let section = `## 🏥 Backend Health Check\n\n`;

  if (typeof healthCheck === "string") {
    section += `${healthCheck}\n\n`;
  } else {
    section += `\`\`\`json\n${JSON.stringify(healthCheck, null, 2)}\n\`\`\`\n\n`;
  }

  section += `---\n\n`;
  return section;
}

function generateArtifactsSection(workflowUrl: string): string {
  let section = `## 📦 Test Artifacts\n\n`;
  section += `Test artifacts (logs, reports, screenshots) are available in the [workflow run artifacts](${workflowUrl}#artifacts).\n\n`;
  section += `---\n\n`;
  return section;
}

function generateNextStepsSection(): string {
  let section = `## 🔍 Next Steps\n\n`;
  section += `1. Review the failed test details above\n`;
  section += `2. Check the health check data for backend issues\n`;
  section += `3. Download and analyze the test artifacts\n`;
  section += `4. Reproduce the failure locally if possible\n`;
  section += `5. Fix the root cause and verify with a new test run\n\n`;
  section += `---\n\n`;
  return section;
}

function generateAssertionSummaries(summaries: Array<[string, string]>): string {
  if (summaries.length === 0) {
    return "";
  }

  let section = `## 📝 Assertion Summaries\n\n`;

  for (const [filename, content] of summaries) {
    section += `### ${filename}\n\n`;
    section += `${content}\n\n`;
  }

  section += `---\n\n`;
  return section;
}

function generateLogTailSection(logTails: Array<[string, string]>): string {
  if (logTails.length === 0) {
    return "";
  }

  let section = `## 📄 Log Tails (Last ${DEFAULT_LOG_TAIL_LENGTH} Lines)\n\n`;

  for (const [filename, content] of logTails) {
    section += `### ${filename}\n\n`;
    section += `\`\`\`\n${content}\n\`\`\`\n\n`;
  }

  return section;
}

/**
 * Extracts workflow metadata from GitHub Actions environment variables
 * @param context - GitHub context containing repository information
 * @returns Workflow metadata object with run details and repository info
 * @throws {Error} When required environment variables (WORKFLOW, RUN_ID, RUN_NUMBER, EVENT_NAME) are missing
 * @example
 * ```typescript
 * const metadata = extractWorkflowMetadata({repo: {owner: 'arolariu', repo: 'arolariu.ro'}});
 * // Returns: {name: 'E2E Tests', runId: '12345', runNumber: '67', ...}
 * ```
 */
function extractWorkflowMetadata(context: {repo: {owner: string; repo: string}}): WorkflowMetadata {
  const workflow = process.env["WORKFLOW"];
  const runId = process.env["RUN_ID"];
  const runNumber = process.env["RUN_NUMBER"];
  const eventName = process.env["EVENT_NAME"];
  const serverUrl = process.env["SERVER_URL"] ?? DEFAULT_GITHUB_SERVER_URL;

  if (!workflow || !runId || !runNumber || !eventName) {
    throw new Error("Missing required environment variables: WORKFLOW, RUN_ID, RUN_NUMBER, or EVENT_NAME");
  }

  const executionDate = new Date().toISOString().split("T")[0] ?? "Unknown Date";

  return {
    name: workflow,
    runId,
    runNumber,
    eventName,
    serverUrl,
    repository: `${context.repo.owner}/${context.repo.repo}`,
    executionDate,
  };
}

/**
 * Extracts E2E test results from environment variables set by the workflow
 * @returns Test results object containing frontend and backend job statuses and durations
 * @example
 * ```typescript
 * // With env vars: FRONTEND_STATUS=success, BACKEND_STATUS=failure
 * const results = extractTestResults();
 * // Returns: {frontend: {status: 'success', duration: '2m 30s'}, backend: {status: 'failure', duration: '1m 45s'}}
 * ```
 */
function extractTestResults(): E2ETestResults {
  const frontendStatus = (process.env["FRONTEND_STATUS"] ?? "unknown") as E2ETestResults["frontend"]["status"];
  const frontendDuration = process.env["FRONTEND_DURATION"] ?? "N/A";
  const backendStatus = (process.env["BACKEND_STATUS"] ?? "unknown") as E2ETestResults["backend"]["status"];
  const backendDuration = process.env["BACKEND_DURATION"] ?? "N/A";

  return {
    frontend: {
      status: frontendStatus,
      duration: frontendDuration,
    },
    backend: {
      status: backendStatus,
      duration: backendDuration,
    },
  };
}

/**
 * Loads backend health check data from environment variable or artifacts directory
 * @param artifacts - Discovered test artifact paths containing potential health check file
 * @returns Health check data object, or fallback error string if data unavailable
 * @example
 * ```typescript
 * const artifacts = {healthCheckPath: 'path/to/health-check.json', ...};
 * const health = await loadHealthCheckData(artifacts);
 * // Returns: {status: 'Healthy', timestamp: '2025-10-20T10:00:00Z', ...}
 * ```
 */
async function loadHealthCheckData(artifacts: TestArtifactPaths): Promise<BackendHealthCheck | string> {
  // First try from environment variable
  const healthJson = process.env["HEALTH_JSON"];
  if (healthJson && healthJson !== "No health data available") {
    try {
      return JSON.parse(healthJson) as BackendHealthCheck;
    } catch {
      // Fall through to file-based approach
    }
  }

  // Try loading from file
  if (artifacts.healthCheck && (await fs.exists(artifacts.healthCheck))) {
    try {
      return await fs.readJson<BackendHealthCheck>(artifacts.healthCheck);
    } catch {
      return "Failed to parse health check data";
    }
  }

  return "No health data available";
}

/**
 * Loads assertion summaries from discovered test artifact files
 * @param artifacts - Discovered test artifact paths containing summary file locations
 * @returns Array of tuples where each contains [filename, file content]
 * @example
 * ```typescript
 * const artifacts = {summaries: ['path/to/summary1.md', 'path/to/summary2.md'], ...};
 * const summaries = await loadAssertionSummaries(artifacts);
 * // Returns: [['summary1.md', 'content...'], ['summary2.md', 'content...']]
 * ```
 */
async function loadAssertionSummaries(artifacts: TestArtifactPaths): Promise<Array<[string, string]>> {
  const summaries: Array<[string, string]> = [];

  if (!artifacts.summaries || artifacts.summaries.length === 0) {
    return summaries;
  }

  for (const summaryPath of artifacts.summaries) {
    try {
      const content = await fs.readText(summaryPath);
      summaries.push([basename(summaryPath), content]);
    } catch (error) {
      console.warn(`Failed to read summary file ${summaryPath}:`, error);
    }
  }

  return summaries;
}

/**
 * Loads log tails (last N lines) from discovered log files in test artifacts
 * @param artifacts - Discovered test artifact paths containing log file locations
 * @param tailLength - Number of lines to read from the end of each log file (default: 50)
 * @returns Array of tuples where each contains [log filename, log tail content]
 * @example
 * ```typescript
 * const artifacts = {logs: ['frontend.log', 'backend.log'], ...};
 * const tails = await loadLogTails(artifacts, 100);
 * // Returns: [['frontend.log', 'last 100 lines...'], ['backend.log', 'last 100 lines...']]
 * ```
 */
async function loadLogTails(artifacts: TestArtifactPaths, tailLength: number = DEFAULT_LOG_TAIL_LENGTH): Promise<Array<[string, string]>> {
  const logTails: Array<[string, string]> = [];

  if (!artifacts.logs || artifacts.logs.length === 0) {
    return logTails;
  }

  for (const logPath of artifacts.logs) {
    try {
      const content = await fs.readText(logPath);
      const lines = content.split("\n");
      const tail = lines.slice(-tailLength).join("\n");
      logTails.push([basename(logPath), tail]);
    } catch (error) {
      console.warn(`Failed to read log file ${logPath}:`, error);
    }
  }

  return logTails;
}

/**
 * Loads and parses Newman JSON reports from test artifacts
 * @param artifacts - Discovered test artifact paths containing Newman JSON reports
 * @returns Promise resolving to object with parsed frontend and backend Newman stats (or null if not found)
 * @example
 * ```typescript
 * const newman = await loadNewmanReports(artifacts);
 * if (newman.frontend) console.log(`Frontend: ${newman.frontend.failedRequests} failures`);
 * ```
 */
async function loadNewmanReports(artifacts: TestArtifactPaths): Promise<{
  frontend: ReturnType<typeof parseNewmanReport> | null;
  backend: ReturnType<typeof parseNewmanReport> | null;
}> {
  const newman = {
    frontend: null as ReturnType<typeof parseNewmanReport> | null,
    backend: null as ReturnType<typeof parseNewmanReport> | null,
  };

  // Find Newman JSON reports
  const frontendReport = artifacts.reports?.find((r) => r.includes("newman-frontend.json"));
  const backendReport = artifacts.reports?.find((r) => r.includes("newman-backend.json"));

  // Parse frontend report
  if (frontendReport && (await fs.exists(frontendReport))) {
    try {
      const reportData = await fs.readJson<NewmanReport>(frontendReport);
      newman.frontend = parseNewmanReport(reportData);
    } catch (error) {
      console.warn(`Failed to parse frontend Newman report:`, error);
    }
  }

  // Parse backend report
  if (backendReport && (await fs.exists(backendReport))) {
    try {
      const reportData = await fs.readJson<NewmanReport>(backendReport);
      newman.backend = parseNewmanReport(reportData);
    } catch (error) {
      console.warn(`Failed to parse backend Newman report:`, error);
    }
  }

  return newman;
}

/**
 * Generates the complete markdown body for an E2E test failure GitHub issue
 * @param metadata - Workflow execution metadata (run ID, repository, date, etc.)
 * @param results - Test execution results for frontend and backend jobs
 * @param artifacts - Discovered test artifact paths (logs, summaries, health checks)
 * @returns Promise resolving to complete markdown issue body with all sections
 * @example
 * ```typescript
 * const body = await generateIssueBody(metadata, results, artifacts);
 * // Returns multi-section markdown with header, status table, health checks, logs, etc.
 * ```
 */
async function generateIssueBody(metadata: WorkflowMetadata, results: E2ETestResults, artifacts: TestArtifactPaths): Promise<string> {
  const workflowUrl = `${metadata.serverUrl}/${metadata.repository}/actions/runs/${metadata.runId}`;

  let body = "";

  // Add header
  body += generateIssueHeader(metadata);

  // Add job status table
  body += generateJobStatusTable(results);

  // Add Newman test results (detailed statistics)
  const newman = await loadNewmanReports(artifacts);
  if (newman.frontend) {
    body += generateNewmanResultsSection(newman.frontend, "Frontend");
  }
  if (newman.backend) {
    body += generateNewmanResultsSection(newman.backend, "Backend");
  }

  // Add failure categorization if we have Newman data
  if (newman.frontend || newman.backend) {
    body += "\n## 📊 Failure Analysis\n\n";

    if (newman.frontend) {
      const frontendCategories = categorizeFailures(newman.frontend);
      body += "### Frontend Failure Breakdown\n\n";
      body += `- **Client Errors (4xx):** ${frontendCategories.clientErrors}\n`;
      body += `- **Server Errors (5xx):** ${frontendCategories.serverErrors}\n`;
      body += `- **Timeouts:** ${frontendCategories.timeouts}\n`;
      body += `- **Assertion Failures:** ${frontendCategories.assertionFailures}\n`;
      body += `- **Other Errors:** ${frontendCategories.other}\n\n`;
    }

    if (newman.backend) {
      const backendCategories = categorizeFailures(newman.backend);
      body += "### Backend Failure Breakdown\n\n";
      body += `- **Client Errors (4xx):** ${backendCategories.clientErrors}\n`;
      body += `- **Server Errors (5xx):** ${backendCategories.serverErrors}\n`;
      body += `- **Timeouts:** ${backendCategories.timeouts}\n`;
      body += `- **Assertion Failures:** ${backendCategories.assertionFailures}\n`;
      body += `- **Other Errors:** ${backendCategories.other}\n\n`;
    }
  }

  // Add health check section
  const healthCheck = await loadHealthCheckData(artifacts);
  body += generateHealthCheckSection(healthCheck);

  // Add artifacts section
  body += generateArtifactsSection(workflowUrl);

  // Add next steps
  body += generateNextStepsSection();

  // Add assertion summaries
  const summaries = await loadAssertionSummaries(artifacts);
  body += generateAssertionSummaries(summaries);

  // Add log tails
  const logTails = await loadLogTails(artifacts);
  body += generateLogTailSection(logTails);

  return body;
}

/**
 * Main function to create a GitHub issue for E2E/live test failures
 * Creates or updates an issue with comprehensive failure diagnostics including logs, health checks, and test results
 * @returns Promise that resolves when the issue is created or updated successfully
 * @throws {Error} When issue creation/update fails or artifact discovery encounters errors
 * @example
 * ```typescript
 * await runLiveTestAction();
 * console.log('E2E failure issue created successfully');
 * ```
 */
export default async function runLiveTestAction(): Promise<void> {
  const github = await import("@actions/github");
  const octokit = github.getOctokit(process.env["GITHUB_TOKEN"] ?? "");
  const context = github.context;
  const core = await import("@actions/core");

  try {
    core.info("🚀 Starting E2E failure issue creation process...");

    // Extract metadata and results
    core.debug("Extracting workflow metadata...");
    const metadata = extractWorkflowMetadata(context);
    core.info(`📋 Workflow: ${metadata.name}, Run: ${metadata.runNumber}, Event: ${metadata.eventName}`);

    core.debug("Extracting test results...");
    const results = extractTestResults();
    core.info(`🧪 Frontend: ${results.frontend.status}, Backend: ${results.backend.status}`);

    // Check if there are any failures
    const hasFailures = results.frontend.status === "failure" || results.backend.status === "failure";
    if (!hasFailures) {
      core.notice("✓ No test failures detected. Skipping issue creation.");
      console.log("No test failures detected. Skipping issue creation.");
      return;
    }

    core.warning("⚠️ Test failures detected - proceeding with issue creation");

    // Discover artifacts
    const artifactsBaseDir = process.env["ARTIFACTS_DIR"] ?? DEFAULT_ARTIFACTS_DIR;
    core.info(`📂 Discovering test artifacts in: ${artifactsBaseDir}`);
    const artifacts = await discoverTestArtifacts(artifactsBaseDir);

    core.info(
      `📊 Artifact summary: ${artifacts.logs?.length ?? 0} logs, ${artifacts.reports?.length ?? 0} reports, ${artifacts.summaries?.length ?? 0} summaries`,
    );
    core.debug(`Health check: ${artifacts.healthCheck ? "Found" : "Not found"}`);
    console.log("Discovered artifacts:", {
      logs: artifacts.logs?.length ?? 0,
      reports: artifacts.reports?.length ?? 0,
      summaries: artifacts.summaries?.length ?? 0,
      healthCheck: artifacts.healthCheck ? "Found" : "Not found",
    });

    // Generate issue body
    core.info("📝 Generating issue body with test results and artifacts...");
    const issueBody = await generateIssueBody(metadata, results, artifacts);
    core.debug(`Issue body length: ${issueBody.length} characters`);

    // Create issue title with date
    const issueTitle = `[${metadata.executionDate}] Hourly Live Test Failed 🚨`;
    core.debug(`Issue title: "${issueTitle}"`);

    // Check for existing issues to avoid duplicates
    core.info(`🔍 Checking for existing issues (date: ${metadata.executionDate})...`);

    const searchQuery = `is:issue repo:${context.repo.owner}/${context.repo.repo} in:title "${metadata.executionDate}" label:${AUTOMATED_TEST_FAILURE_LABELS[0]}`;
    const searchResults = await octokit.rest.search.issuesAndPullRequests({
      q: searchQuery,
      sort: "created",
      order: "desc",
      per_page: 10,
    });

    const openIssues = searchResults.data.items.filter((issue) => issue.state === "open");
    core.debug(`Found ${searchResults.data.total_count} total issues, ${openIssues.length} open`);

    if (openIssues.length > 0) {
      core.warning(`⏭️ Existing open issue found: #${openIssues[0]!.number}. Skipping duplicate creation.`);
      console.log(`Found existing open issue: #${openIssues[0]!.number}. Skipping duplicate creation.`);
      return;
    }

    // Create the issue
    core.info(`✨ Creating new GitHub issue...`);
    const issueResponse = await octokit.rest.issues.create({
      owner: context.repo.owner,
      repo: context.repo.repo,
      title: issueTitle,
      body: issueBody,
      labels: AUTOMATED_TEST_FAILURE_LABELS,
      assignees: ["arolariu"],
    });

    core.info(`✓ Successfully created issue #${issueResponse.data.number}`);
    core.notice(`Created E2E test failure issue: ${issueResponse.data.html_url}`);
    console.log(`Successfully created issue #${issueResponse.data.number}: ${issueResponse.data.html_url}`);
    core.info("🎉 E2E failure issue process completed successfully");
  } catch (error) {
    const err = error as Error;
    core.error(`❌ E2E failure issue creation failed: ${err.message}`);
    core.error(`Stack trace: ${err.stack ?? "No stack trace available"}`);
    core.setFailed(`Failed to create E2E test failure issue: ${err.message}`);
    throw error;
  }
}
