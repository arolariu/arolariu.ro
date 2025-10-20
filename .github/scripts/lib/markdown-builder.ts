/**
 * @fileoverview Markdown generation utilities for issues and comments
 * @module lib/markdown-builder
 */

import {basename} from "node:path";
import type {BackendHealthCheck, E2ETestResults, WorkflowMetadata} from "../types/workflow-types.ts";
import {DEFAULT_LOG_TAIL_LENGTH, STATUS_EMOJI} from "./constants.ts";

/**
 * Generates the header section for an E2E test failure GitHub issue
 * @param metadata - Workflow execution metadata containing run information
 * @returns Formatted markdown string for the issue header with workflow details
 * @example
 * ```typescript
 * const header = generateIssueHeader({
 *   name: 'E2E Tests',
 *   runId: '12345',
 *   runNumber: '67',
 *   eventName: 'schedule',
 *   serverUrl: 'https://github.com',
 *   repository: 'arolariu/arolariu.ro',
 *   executionDate: '2025-10-20'
 * });
 * ```
 */
export function generateIssueHeader(metadata: WorkflowMetadata): string {
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

/**
 * Generates a formatted job status table for E2E test results
 * @param results - Test execution results for frontend and backend jobs
 * @returns Markdown table showing job names, statuses with emojis, and durations
 * @example
 * ```typescript
 * const table = generateJobStatusTable({
 *   frontend: { status: 'success', duration: '2m 30s' },
 *   backend: { status: 'failure', duration: '1m 45s' }
 * });
 * // Returns: | Frontend | ✅ `success` | 2m 30s |
 * //          | Backend  | ❌ `failure` | 1m 45s |
 * ```
 */
export function generateJobStatusTable(results: E2ETestResults): string {
  const {frontend, backend} = results;

  const formatStatus = (status: string): string => {
    const emoji = STATUS_EMOJI[status as keyof typeof STATUS_EMOJI] ?? STATUS_EMOJI.unknown;
    return `${emoji} \`${status}\``;
  };

  let markdown = `### 🛠️ Job Status\n\n`;
  markdown += `| Job Name | Status | Duration |\n`;
  markdown += `|----------|--------|----------|\n`;
  markdown += `| Frontend | ${formatStatus(frontend.status)} | ${frontend.duration ?? "N/A"} |\n`;
  markdown += `| Backend  | ${formatStatus(backend.status)} | ${backend.duration ?? "N/A"} |\n\n`;
  markdown += `---\n\n`;

  return markdown;
}

/**
 * Generates a markdown section displaying backend health check data
 * @param healthCheck - Backend health check response object or fallback string
 * @returns Markdown section with JSON-formatted health check data
 * @example
 * ```typescript
 * const healthData = {
 *   status: 'Healthy',
 *   timestamp: '2025-10-20T10:00:00Z',
 *   dependencies: { database: 'ok', cache: 'ok' }
 * };
 * const section = generateHealthCheckSection(healthData);
 * ```
 */
export function generateHealthCheckSection(healthCheck: BackendHealthCheck | string): string {
  let markdown = `### 🌡️ Backend Health Snapshot\n\n`;
  markdown += `Below is the \`/health\` endpoint response at the time of testing:\n\n`;
  markdown += "```json\n";

  if (typeof healthCheck === "string") {
    markdown += healthCheck;
  } else {
    markdown += JSON.stringify(healthCheck, null, 2);
  }

  markdown += "\n```\n\n";
  markdown += `---\n\n`;

  return markdown;
}

/**
 * Generates a markdown section with links to logs and workflow artifacts
 * @param workflowUrl - Full URL to the GitHub Actions workflow run
 * @returns Markdown section with artifact links
 * @example
 * ```typescript
 * const section = generateArtifactsSection(
 *   'https://github.com/arolariu/arolariu.ro/actions/runs/12345'
 * );
 * ```
 */
export function generateArtifactsSection(workflowUrl: string): string {
  let markdown = `### 📄 Logs & Artifacts\n\n`;
  markdown += `- [View Full Workflow Logs](${workflowUrl})\n`;
  markdown += `- Download attached artifacts for detailed logs.\n\n`;
  markdown += `---\n\n`;

  return markdown;
}

/**
 * Generates a markdown section with suggested next steps for debugging test failures
 * @returns Markdown section with numbered list of debugging recommendations
 * @example
 * ```typescript
 * const steps = generateNextStepsSection();
 * // Returns a numbered list with debugging recommendations
 * ```
 */
export function generateNextStepsSection(): string {
  let markdown = `### 🔍 Suggested Next Steps\n\n`;
  markdown += `1. If the backend health check shows \`"status": "Unhealthy"\`, investigate failing dependencies first.\n`;
  markdown += `2. Review the **log tail** below for immediate clues.\n`;
  markdown += `3. Check full logs for stack traces or assertion errors.\n`;
  markdown += `4. Re-run the workflow manually to confirm reproducibility.\n\n`;
  markdown += `---\n\n`;

  return markdown;
}

/**
 * Generates a markdown section displaying test assertion summaries
 * @param summaryContents - Array of tuples where each contains [filename, file content]
 * @returns Markdown section with all summary files formatted as subsections
 * @example
 * ```typescript
 * const summaries = [
 *   ['frontend-summary.md', '## Results\n- 10 passed\n- 2 failed'],
 *   ['backend-summary.md', '## Results\n- 8 passed\n- 1 failed']
 * ];
 * const section = generateAssertionSummaries(summaries);
 * ```
 */
export function generateAssertionSummaries(summaryContents: Array<[string, string]>): string {
  let markdown = `### ❌ Assertion Summaries\n\n`;

  if (summaryContents.length === 0) {
    markdown += `No assertion summary files found.\n\n`;
    return markdown;
  }

  for (const [filename, content] of summaryContents) {
    markdown += `#### ${basename(filename)}\n\n`;
    markdown += `${content}\n\n`;
  }

  markdown += `---\n\n`;

  return markdown;
}

/**
 * Generates a markdown section with the last N lines from each log file
 * @param logTails - Array of tuples where each contains [filename, log tail content]
 * @param tailLength - Number of lines included in each tail (default: 50)
 * @returns Markdown section with log tails in code blocks
 * @example
 * ```typescript
 * const tails = [
 *   ['frontend.log', 'Error: Test failed\n  at line 42'],
 *   ['backend.log', 'Server started on port 3000']
 * ];
 * const section = generateLogTailSection(tails, 100);
 * ```
 */
export function generateLogTailSection(logTails: Array<[string, string]>, tailLength: number = DEFAULT_LOG_TAIL_LENGTH): string {
  let markdown = `## 🔥 Log Tail from Failed Jobs (Last ${tailLength} lines)\n\n`;

  if (logTails.length === 0) {
    markdown += `No log files found.\n\n`;
    return markdown;
  }

  for (const [filename, content] of logTails) {
    markdown += `### ${basename(filename)}\n\n`;
    markdown += "```\n";
    markdown += content;
    markdown += "\n```\n\n";
  }

  return markdown;
}
