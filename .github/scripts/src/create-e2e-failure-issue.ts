/**
 * @fileoverview Creates GitHub issues for E2E test failures with detailed diagnostics
 * @module src/create-e2e-failure-issue
 */

import {basename} from "node:path";
import {
  AUTOMATED_TEST_FAILURE_LABELS,
  DEFAULT_ARTIFACTS_DIR,
  DEFAULT_GITHUB_SERVER_URL,
  DEFAULT_LOG_TAIL_LENGTH,
} from "../lib/constants.ts";
import {discoverTestArtifacts, fileExists, readJsonFile, readLogTail, readTextFile} from "../lib/file-system-helper.ts";
import {createGitHubIssue, findExistingIssues} from "../lib/issue-creator.ts";
import {
  generateArtifactsSection,
  generateAssertionSummaries,
  generateHealthCheckSection,
  generateIssueHeader,
  generateJobStatusTable,
  generateLogTailSection,
  generateNextStepsSection,
} from "../lib/markdown-builder.ts";
import {categorizeFailures, generateNewmanResultsSection, parseNewmanReport} from "../lib/newman-parser.ts";
import type {ScriptParams} from "../types/index.ts";
import type {NewmanReport} from "../types/newman-types.ts";
import type {BackendHealthCheck, E2ETestResults, TestArtifactPaths, WorkflowMetadata} from "../types/workflow-types.ts";

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
  if (artifacts.healthCheck && (await fileExists(artifacts.healthCheck))) {
    try {
      return await readJsonFile<BackendHealthCheck>(artifacts.healthCheck);
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
      const content = await readTextFile(summaryPath);
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
      const tail = await readLogTail(logPath, tailLength);
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
  if (frontendReport && (await fileExists(frontendReport))) {
    try {
      const reportData = await readJsonFile<NewmanReport>(frontendReport);
      newman.frontend = parseNewmanReport(reportData);
    } catch (error) {
      console.warn(`Failed to parse frontend Newman report:`, error);
    }
  }

  // Parse backend report
  if (backendReport && (await fileExists(backendReport))) {
    try {
      const reportData = await readJsonFile<NewmanReport>(backendReport);
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
 * Main function to create a GitHub issue for E2E test failures
 * Creates or updates an issue with comprehensive failure diagnostics including logs, health checks, and test results
 * @param params - Script parameters from GitHub Actions containing Octokit client, context, and core utilities
 * @returns Promise that resolves when the issue is created or updated successfully
 * @throws {Error} When issue creation/update fails or artifact discovery encounters errors
 * @example
 * ```typescript
 * const params = {github: octokit, context: {...}, core: {...}, exec: {...}};
 * await createE2EFailureIssue(params);
 * console.log('E2E failure issue created successfully');
 * ```
 */
export default async function createE2EFailureIssue(params: ScriptParams): Promise<void> {
  const {github: octokit, context, core} = params;

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
    const existingIssues = await findExistingIssues(
      octokit,
      {owner: context.repo.owner, name: context.repo.repo},
      metadata.executionDate,
      AUTOMATED_TEST_FAILURE_LABELS,
    );

    const openIssues = existingIssues.filter((issue) => issue.state === "open");
    core.debug(`Found ${existingIssues.length} total issues, ${openIssues.length} open`);

    if (openIssues.length > 0) {
      core.warning(`⏭️ Existing open issue found: #${openIssues[0]!.number}. Skipping duplicate creation.`);
      console.log(`Found existing open issue: #${openIssues[0]!.number}. Skipping duplicate creation.`);
      return;
    }

    // Create the issue
    core.info(`✨ Creating new GitHub issue...`);
    const issue = await createGitHubIssue(
      octokit,
      {owner: context.repo.owner, name: context.repo.repo},
      {
        title: issueTitle,
        body: issueBody,
        labels: AUTOMATED_TEST_FAILURE_LABELS,
        assignees: ["arolariu"],
      },
    );

    core.info(`✓ Successfully created issue #${issue.number}`);
    core.notice(`Created E2E test failure issue: ${issue.url}`);
    console.log(`Successfully created issue #${issue.number}: ${issue.url}`);
    core.info("🎉 E2E failure issue process completed successfully");
  } catch (error) {
    const err = error as Error;
    core.error(`❌ E2E failure issue creation failed: ${err.message}`);
    core.error(`Stack trace: ${err.stack ?? "No stack trace available"}`);
    core.setFailed(`Failed to create E2E test failure issue: ${err.message}`);
    throw error;
  }
}
