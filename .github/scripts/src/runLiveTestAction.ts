/**
 * @fileoverview Unified live test (E2E) action script for GitHub Actions workflows.
 * @module github/scripts/src/runLiveTestAction
 */

import {basename} from "node:path";
import {fileURLToPath} from "node:url";
import {
  AUTOMATED_TEST_FAILURE_LABELS,
  DEFAULT_ARTIFACTS_DIR,
  DEFAULT_GITHUB_SERVER_URL,
  HEALTH_CHECK_FILENAME,
  STATUS_EMOJI,
  fs,
  newman,
} from "../helpers/index.ts";
import type {FailureCategories, NewmanExecutionStats, NewmanReport} from "../helpers/newman/index.ts";

export type JobStatus = "success" | "failure" | "cancelled" | "skipped" | "unknown";

export interface TargetTestResult {
  readonly duration: string;
  readonly status: JobStatus;
}

export type E2ETestResults = Readonly<Record<string, TargetTestResult>>;

export interface WorkflowMetadata {
  readonly eventName: string;
  readonly executionDate: string;
  readonly name: string;
  readonly repository: string;
  readonly runId: string;
  readonly runNumber: string;
  readonly serverUrl: string;
}

export interface BackendHealthCheck {
  readonly dependencies?: Record<string, unknown>;
  readonly status: string;
  readonly timestamp: string;
  readonly version?: string;
  readonly [key: string]: unknown;
}

export interface TestArtifactPaths {
  readonly healthCheck?: string;
  readonly logs: readonly string[];
  readonly reports: readonly string[];
  readonly statuses: readonly string[];
  readonly summaries: readonly string[];
}

const DEFAULT_TARGETS = ["frontend", "backend", "cv"] as const;
const DEFAULT_E2E_TEMPLATE_PATH = fileURLToPath(new URL("../../templates/e2e-test-template.md", import.meta.url));
const TEMPLATE_PLACEHOLDER_REGEX = /\$([A-Z0-9_]+)/g;
const DEFAULT_MAX_ISSUE_BODY_CHARS = 65_000;
const DEFAULT_MAX_LOG_TAIL_CHARS = 2_000;
const DEFAULT_MAX_ASSERTION_SUMMARY_CHARS = 12_000;
const DEFAULT_MAX_TARGET_SUMMARY_CHARS = 4_000;

interface SummaryTableMetric {
  readonly executed: number;
  readonly failed: number;
}

interface SummaryTableMetrics {
  readonly assertions: SummaryTableMetric | null;
  readonly requests: SummaryTableMetric | null;
}

interface FallbackTargetMetrics {
  readonly failureCategories: FailureCategories | null;
  readonly failedAssertions: number | null;
  readonly failedRequests: number | null;
  readonly source: "none" | "summary-table";
  readonly totalAssertions: number | null;
  readonly totalRequests: number | null;
}

function capitalizeTarget(target: string): string {
  if (target.length === 0) {
    return "Unknown";
  }

  return target[0]!.toUpperCase() + target.slice(1);
}

function normalizeTargetKey(target: string): string {
  return target.replaceAll(/[^a-zA-Z0-9]/g, "_").toUpperCase();
}

function extractTargetFromLogPath(logPath: string): string | null {
  const filename = basename(logPath);
  const match = /^e2e-([a-z0-9-]+)\.log$/i.exec(filename);
  return match ? match[1]!.toLowerCase() : null;
}

function extractTargetFromSummaryFilename(summaryFilename: string): string | null {
  const match = /^newman-([a-z0-9-]+)-summary\.md$/i.exec(summaryFilename);
  return match ? match[1]!.toLowerCase() : null;
}

function normalizeRequestName(name: string): string {
  const trimmedName = name.trim();
  const segments = trimmedName.split(" / ");
  return (segments.at(-1) ?? trimmedName).trim();
}

function extractNewmanSummaryTable(logContent: string): string | null {
  const lines = logContent.split(/\r?\n/);

  for (let index = 0; index < lines.length; index++) {
    const candidateLine = lines[index] ?? "";
    if (!candidateLine.includes("┌") || !candidateLine.includes("┬")) {
      continue;
    }

    let endIndex = index + 1;
    while (endIndex < lines.length) {
      const currentLine = lines[endIndex] ?? "";
      if (currentLine.includes("└") && currentLine.includes("┘")) {
        const candidateBlock = lines.slice(index, endIndex + 1).join("\n");
        if (
          candidateBlock.includes("executed") &&
          candidateBlock.includes("failed") &&
          candidateBlock.includes("requests") &&
          candidateBlock.includes("assertions")
        ) {
          return candidateBlock;
        }

        break;
      }

      endIndex++;
    }
  }

  return null;
}

function parseSummaryTableMetric(summaryTable: string, metricName: "requests" | "assertions"): SummaryTableMetric | null {
  const metricPattern = new RegExp(`[\\|│]\\s*${metricName}\\s*[\\|│]\\s*(\\d+)\\s*[\\|│]\\s*(\\d+)\\s*[\\|│]`, "i");
  const match = metricPattern.exec(summaryTable);

  if (!match?.[1] || !match[2]) {
    return null;
  }

  const executed = Number.parseInt(match[1], 10);
  const failed = Number.parseInt(match[2], 10);

  if (!Number.isFinite(executed) || !Number.isFinite(failed)) {
    return null;
  }

  return {executed, failed};
}

function parseSummaryTableMetrics(summaryTable: string | null): SummaryTableMetrics {
  if (!summaryTable) {
    return {assertions: null, requests: null};
  }

  return {
    assertions: parseSummaryTableMetric(summaryTable, "assertions"),
    requests: parseSummaryTableMetric(summaryTable, "requests"),
  };
}

function extractRequestStatusesFromLog(logContent: string): Readonly<Record<string, number>> {
  const requestStatuses: Record<string, number> = {};
  const lines = logContent.split(/\r?\n/);

  let currentRequestName: string | null = null;

  for (const line of lines) {
    const requestMatch = /^\s*↳\s+(.+?)\s*$/.exec(line);
    if (requestMatch?.[1]) {
      currentRequestName = normalizeRequestName(requestMatch[1]);
      continue;
    }

    if (!currentRequestName) {
      continue;
    }

    const statusMatch = /\[(\d{3})\s+[^\]]+\]/.exec(line);
    if (!statusMatch?.[1]) {
      continue;
    }

    requestStatuses[currentRequestName] = Number.parseInt(statusMatch[1], 10);
    currentRequestName = null;
  }

  return requestStatuses;
}

function parseSummaryFailuresByRequest(summaryContent: string): Readonly<Record<string, readonly string[]>> {
  const failuresByRequest = new Map<string, string[]>();
  const lines = summaryContent.split(/\r?\n/);

  let currentErrorMessage = "";

  for (const line of lines) {
    const requestMatch = /^\s*in\s+"([^"]+)"/.exec(line);
    if (requestMatch?.[1]) {
      const requestName = normalizeRequestName(requestMatch[1]);
      const messages = failuresByRequest.get(requestName) ?? [];
      messages.push(currentErrorMessage);
      failuresByRequest.set(requestName, messages);
      currentErrorMessage = "";
      continue;
    }

    const messageMatch = /^\s{3}(.+)$/.exec(line);
    if (!messageMatch?.[1]) {
      continue;
    }

    const message = messageMatch[1].trim();
    if (!message.startsWith("in \"")) {
      currentErrorMessage = message;
    }
  }

  const serializedFailures: Record<string, readonly string[]> = {};
  for (const [requestName, messages] of failuresByRequest.entries()) {
    serializedFailures[requestName] = messages;
  }

  return serializedFailures;
}

function deriveFallbackFailureCategories(
  requestStatuses: Readonly<Record<string, number>>,
  summaryContent: string | null,
): FailureCategories | null {
  if (!summaryContent) {
    return null;
  }

  const failuresByRequest = parseSummaryFailuresByRequest(summaryContent);
  const failedRequests = Object.keys(failuresByRequest);
  if (failedRequests.length === 0) {
    return null;
  }

  const categories: FailureCategories = {
    assertionFailures: 0,
    clientErrors: 0,
    other: 0,
    serverErrors: 0,
    timeouts: 0,
  };

  for (const requestName of failedRequests) {
    const statusCode = requestStatuses[requestName];
    const failureMessages = failuresByRequest[requestName] ?? [];

    if (typeof statusCode === "number" && statusCode >= 400 && statusCode < 500) {
      categories.clientErrors++;
      continue;
    }

    if (typeof statusCode === "number" && statusCode >= 500) {
      categories.serverErrors++;
      continue;
    }

    if (failureMessages.some((message) => message.toLowerCase().includes("timeout"))) {
      categories.timeouts++;
      continue;
    }

    if (failureMessages.length > 0) {
      categories.assertionFailures++;
      continue;
    }

    categories.other++;
  }

  return categories;
}

function generateFallbackSummaryMarkdown(target: string, fallbackMetrics: FallbackTargetMetrics): string {
  if (fallbackMetrics.source !== "summary-table") {
    return "No Newman JSON report captured for this target and no parsable Newman CLI summary table was found.";
  }

  return [
    "### Derived from Newman CLI summary table",
    "",
    "| Metric | Executed | Failed |",
    "|--------|----------|--------|",
    `| Requests | ${fallbackMetrics.totalRequests ?? "unknown"} | ${fallbackMetrics.failedRequests ?? "unknown"} |`,
    `| Assertions | ${fallbackMetrics.totalAssertions ?? "unknown"} | ${fallbackMetrics.failedAssertions ?? "unknown"} |`,
    "",
    `_Source: parsed from ${target} log output because Newman JSON report was unavailable._`,
  ].join("\n");
}

function fillTemplatePlaceholders(template: string, variables: Readonly<Record<string, string>>): string {
  return template.replace(TEMPLATE_PLACEHOLDER_REGEX, (_match, key: string) => variables[key] ?? "N/A");
}

function readPositiveIntegerEnv(name: string, fallback: number): number {
  const rawValue = process.env[name];
  if (!rawValue) {
    return fallback;
  }

  const parsedValue = Number(rawValue);
  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return fallback;
  }

  return Math.floor(parsedValue);
}

function truncateText(content: string, maxChars: number, suffix: string): string {
  if (content.length <= maxChars) {
    return content;
  }

  const availableChars = Math.max(0, maxChars - suffix.length);
  return content.slice(0, availableChars) + suffix;
}

function generateCompactIssueBody(
  metadata: WorkflowMetadata,
  results: E2ETestResults,
  newmanReports: Readonly<Record<string, NewmanExecutionStats>>,
): string {
  const workflowUrl = `${metadata.serverUrl}/${metadata.repository}/actions/runs/${metadata.runId}`;

  let body = "## 🚨 Live E2E Test Failure Report (Compact)\n\n";
  body +=
    "Issue body exceeded the GitHub limit, so detailed failure payload was trimmed. Use workflow artifacts and matrix job logs for full diagnostics.\n\n";
  body += `- Workflow run: [${metadata.runId}](${workflowUrl})\n`;
  body += `- Artifacts: [View artifacts](${workflowUrl}#artifacts)\n`;
  body += `- Trigger: \`${metadata.eventName}\`\n`;
  body += `- Execution date: \`${metadata.executionDate}\`\n\n`;
  body += generateJobStatusTable(results);

  if (Object.keys(newmanReports).length > 0) {
    body += "## 📊 Failure Snapshot\n\n";
    body += "| Target | Failed Requests | Failed Assertions |\n";
    body += "|--------|-----------------|-------------------|\n";

    for (const target of Object.keys(newmanReports).sort((left, right) => left.localeCompare(right))) {
      const report = newmanReports[target]!;
      body += `| ${capitalizeTarget(target)} | ${report.failedRequests} | ${report.failedAssertions} |\n`;
    }

    body += "\n";
  }

  body += "## 🔍 Next Steps\n\n";
  body += "1. Open workflow artifacts and inspect `newman-*.xml`, `newman-*-summary.md`, and `e2e-*.log`\n";
  body += "2. Inspect matrix job logs for target-specific stack traces and assertion errors\n";
  body += "3. Reproduce locally with `node scripts/test-e2e.ts <target>`\n";

  return body;
}

function enforceIssueBodyLimit(
  body: string,
  metadata: WorkflowMetadata,
  results: E2ETestResults,
  newmanReports: Readonly<Record<string, NewmanExecutionStats>>,
): string {
  const maxIssueBodyChars = readPositiveIntegerEnv("E2E_MAX_ISSUE_BODY_CHARS", DEFAULT_MAX_ISSUE_BODY_CHARS);
  if (body.length <= maxIssueBodyChars) {
    return body;
  }

  const compactBody = generateCompactIssueBody(metadata, results, newmanReports);
  if (compactBody.length <= maxIssueBodyChars) {
    return compactBody;
  }

  return truncateText(compactBody, maxIssueBodyChars, "\n\n...(trimmed due to issue size limit)");
}

export function parseTargetsFromEnvironment(): readonly string[] {
  const rawTargets = process.env["TARGETS"];
  if (!rawTargets) {
    return [...DEFAULT_TARGETS];
  }

  try {
    const parsedTargets = JSON.parse(rawTargets) as unknown;
    if (!Array.isArray(parsedTargets)) {
      return [...DEFAULT_TARGETS];
    }

    const normalizedTargets = parsedTargets
      .filter((target): target is string => typeof target === "string")
      .map((target) => target.trim().toLowerCase())
      .filter((target) => target.length > 0);

    if (normalizedTargets.length === 0) {
      return [...DEFAULT_TARGETS];
    }

    return [...new Set(normalizedTargets)];
  } catch {
    return [...DEFAULT_TARGETS];
  }
}

export function extractTargetFromReportPath(reportPath: string): string | null {
  const filename = basename(reportPath);
  const match = /^newman-([a-z0-9-]+)\.json$/i.exec(filename);
  return match ? match[1]!.toLowerCase() : null;
}

function extractTargetFromStatusPath(statusPath: string): string | null {
  const filename = basename(statusPath);
  const match = /^e2e-status-([a-z0-9-]+)\.json$/i.exec(filename);
  return match ? match[1]!.toLowerCase() : null;
}

export async function discoverTestArtifacts(baseDir: string): Promise<TestArtifactPaths> {
  const artifacts = {
    logs: [] as string[],
    reports: [] as string[],
    statuses: [] as string[],
    summaries: [] as string[],
  };

  try {
    const exists = await fs.exists(baseDir);
    if (!exists) {
      return artifacts;
    }

    const [logFiles, reportFiles, statusFiles, summaryFiles, healthCheckFiles] = await Promise.all([
      fs.find(baseDir, /\.log$/i),
      fs.find(baseDir, /^newman-[a-z0-9-]+\.json$/i),
      fs.find(baseDir, /^e2e-status-[a-z0-9-]+\.json$/i),
      fs.find(baseDir, /^newman-[a-z0-9-]+-summary\.md$/i),
      fs.find(baseDir, new RegExp(`^${HEALTH_CHECK_FILENAME.replaceAll(".", "\\.")}$`, "i")),
    ]);

    artifacts.logs.push(...logFiles);
    artifacts.reports.push(...reportFiles);
    artifacts.statuses.push(...statusFiles);
    artifacts.summaries.push(...summaryFiles);

    const healthCheck = healthCheckFiles[0];
    if (healthCheck) {
      return {
        ...artifacts,
        healthCheck,
      };
    }
  } catch (error) {
    console.warn(`Failed to discover artifacts in ${baseDir}:`, error);
  }

  return artifacts;
}

function generateIssueHeader(metadata: WorkflowMetadata): string {
  const workflowUrl = `${metadata.serverUrl}/${metadata.repository}/actions/runs/${metadata.runId}`;

  let markdown = "## 🚨 Live Test Failure Report\n\n";
  markdown += `**Workflow:** \`${metadata.name}\`\n`;
  markdown += `**Run ID:** [${metadata.runId}](${workflowUrl})\n`;
  markdown += `**Run Number:** \`${metadata.runNumber}\`\n`;
  markdown += `**Triggered By:** \`${metadata.eventName}\`\n`;
  markdown += `**Execution Time (UTC):** \`${metadata.executionDate}\`\n\n`;
  markdown += "---\n\n";

  return markdown;
}

function generateJobStatusTable(results: E2ETestResults): string {
  const targets = Object.keys(results).sort((left, right) => left.localeCompare(right));

  let table = "## 📋 Job Status\n\n";
  table += "| Target | Status | Duration |\n";
  table += "|--------|--------|----------|\n";

  for (const target of targets) {
    const result = results[target];
    if (!result) {
      continue;
    }

    const statusEmoji = STATUS_EMOJI[result.status];
    table += `| ${capitalizeTarget(target)} | ${statusEmoji} ${result.status} | ${result.duration} |\n`;
  }

  table += "\n---\n\n";
  return table;
}

function generateHealthCheckSection(healthCheck: BackendHealthCheck | string): string {
  let section = "## 🏥 Backend Health Check\n\n";

  if (typeof healthCheck === "string") {
    section += `${healthCheck}\n\n`;
  } else {
    section += `\`\`\`json\n${JSON.stringify(healthCheck, null, 2)}\n\`\`\`\n\n`;
  }

  section += "---\n\n";
  return section;
}

function generateArtifactsSection(workflowUrl: string): string {
  let section = "## 📦 Test Artifacts\n\n";
  section += `Test artifacts (logs, reports, summaries) are available in the [workflow run artifacts](${workflowUrl}#artifacts).\n\n`;
  section += "---\n\n";
  return section;
}

function generateNextStepsSection(): string {
  let section = "## 🔍 Next Steps\n\n";
  section += "1. Review the per-target failure sections and status table\n";
  section += "2. Check backend health details and artifact summaries\n";
  section += "3. Inspect Newman summary/Xml artifacts and per-target logs for failing assertions and status mismatches\n";
  section += "4. Reproduce the issue locally using the same collection/environment profile\n";
  section += "5. Apply fix and rerun live E2E workflow\n\n";
  section += "---\n\n";
  return section;
}

function generateAssertionSummaries(summaries: ReadonlyArray<readonly [string, string]>): string {
  if (summaries.length === 0) {
    return "";
  }

  let section = "## 📝 Assertion Summaries\n\n";

  for (const [filename, content] of summaries) {
    section += `### ${filename}\n\n`;
    section += `${content}\n\n`;
  }

  section += "---\n\n";
  return section;
}

function generateLogTailSection(logTails: ReadonlyArray<readonly [string, string]>): string {
  if (logTails.length === 0) {
    return "";
  }

  let section = "## 📄 Log Tails\n\n";

  for (const [filename, content] of logTails) {
    section += `### ${filename}\n\n`;
    section += `\`\`\`\n${content}\n\`\`\`\n\n`;
  }

  return section;
}

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
    eventName,
    executionDate,
    name: workflow,
    repository: `${context.repo.owner}/${context.repo.repo}`,
    runId,
    runNumber,
    serverUrl,
  };
}

export function extractTestResults(targets: readonly string[]): E2ETestResults {
  const results: Record<string, TargetTestResult> = {};

  for (const target of targets) {
    const targetKey = normalizeTargetKey(target);
    const status = ((process.env[`${targetKey}_STATUS`] ?? "unknown").toLowerCase() as JobStatus);
    const duration = process.env[`${targetKey}_DURATION`] ?? "N/A";
    results[target] = {duration, status};
  }

  return results;
}

async function loadStatusArtifacts(artifacts: TestArtifactPaths): Promise<E2ETestResults> {
  const results: Record<string, TargetTestResult> = {};

  for (const statusPath of artifacts.statuses) {
    try {
      const target = extractTargetFromStatusPath(statusPath);
      if (!target) {
        continue;
      }

      const payload = await fs.readJson<{duration?: string; status?: JobStatus}>(statusPath);
      results[target] = {
        duration: payload.duration ?? "N/A",
        status: payload.status ?? "unknown",
      };
    } catch (error) {
      console.warn(`Failed to parse status artifact ${statusPath}:`, error);
    }
  }

  return results;
}

async function loadHealthCheckData(artifacts: TestArtifactPaths): Promise<BackendHealthCheck | string> {
  const healthJson = process.env["HEALTH_JSON"];
  if (healthJson && healthJson !== "No health data available") {
    try {
      return JSON.parse(healthJson) as BackendHealthCheck;
    } catch {
      // Fallback to file-based approach.
    }
  }

  if (artifacts.healthCheck && (await fs.exists(artifacts.healthCheck))) {
    try {
      return await fs.readJson<BackendHealthCheck>(artifacts.healthCheck);
    } catch {
      return "Failed to parse health check data";
    }
  }

  return "No health data available";
}

async function loadAssertionSummaries(artifacts: TestArtifactPaths): Promise<Array<[string, string]>> {
  const summaries: Array<[string, string]> = [];

  for (const summaryPath of [...artifacts.summaries].sort((left, right) => left.localeCompare(right))) {
    try {
      const content = await fs.readText(summaryPath);
      summaries.push([basename(summaryPath), content]);
    } catch (error) {
      console.warn(`Failed to read summary file ${summaryPath}:`, error);
    }
  }

  return summaries;
}

async function loadLogTails(artifacts: TestArtifactPaths): Promise<Array<[string, string]>> {
  const logTails: Array<[string, string]> = [];

  for (const logPath of [...artifacts.logs].sort((left, right) => left.localeCompare(right))) {
    try {
      const content = await fs.readText(logPath);
      const summaryTable = extractNewmanSummaryTable(content);
      const tableOrMessage = summaryTable ?? "No Newman CLI summary table found in this target log.";
      logTails.push([basename(logPath), tableOrMessage]);
    } catch (error) {
      console.warn(`Failed to read log file ${logPath}:`, error);
    }
  }

  return logTails;
}

async function loadLogInsights(artifacts: TestArtifactPaths): Promise<Readonly<Record<string, {readonly requestStatuses: Readonly<Record<string, number>>; readonly summaryTable: string | null}>>> {
  const insights: Record<string, {readonly requestStatuses: Readonly<Record<string, number>>; readonly summaryTable: string | null}> = {};

  for (const logPath of [...artifacts.logs].sort((left, right) => left.localeCompare(right))) {
    try {
      const target = extractTargetFromLogPath(logPath);
      if (!target) {
        continue;
      }

      const content = await fs.readText(logPath);
      insights[target] = {
        requestStatuses: extractRequestStatusesFromLog(content),
        summaryTable: extractNewmanSummaryTable(content),
      };
    } catch (error) {
      console.warn(`Failed to parse log insights for ${logPath}:`, error);
    }
  }

  return insights;
}

export async function loadNewmanReports(
  artifacts: TestArtifactPaths,
): Promise<Readonly<Record<string, NewmanExecutionStats>>> {
  const reports: Record<string, NewmanExecutionStats> = {};

  for (const reportPath of artifacts.reports) {
    const target = extractTargetFromReportPath(reportPath);
    if (!target) {
      continue;
    }

    try {
      const reportData = await fs.readJson<NewmanReport>(reportPath);
      reports[target] = newman.parseReport(reportData);
    } catch (error) {
      console.warn(`Failed to parse Newman report (${reportPath}):`, error);
    }
  }

  return reports;
}

function mergeResults(
  targets: readonly string[],
  baseResults: E2ETestResults,
  statusResults: E2ETestResults,
  newmanReports: Readonly<Record<string, NewmanExecutionStats>>,
): E2ETestResults {
  const merged: Record<string, TargetTestResult> = {};
  const allTargets = new Set([...targets, ...Object.keys(baseResults), ...Object.keys(statusResults), ...Object.keys(newmanReports)]);

  for (const target of allTargets) {
    const fromBase = baseResults[target];
    const fromStatusArtifact = statusResults[target];
    const fromReport = newmanReports[target];

    let status: JobStatus = fromStatusArtifact?.status ?? fromBase?.status ?? "unknown";
    let duration = fromStatusArtifact?.duration ?? fromBase?.duration ?? "N/A";

    if (fromReport) {
      status = fromReport.failedRequests > 0 || fromReport.failedAssertions > 0 ? "failure" : "success";
      duration = `${(fromReport.timings.totalDuration / 1000).toFixed(2)}s`;
    }

    merged[target] = {duration, status};
  }

  return merged;
}

async function generateIssueBody(
  metadata: WorkflowMetadata,
  results: E2ETestResults,
  artifacts: TestArtifactPaths,
  newmanReports: Readonly<Record<string, NewmanExecutionStats>>,
): Promise<string> {
  const workflowUrl = `${metadata.serverUrl}/${metadata.repository}/actions/runs/${metadata.runId}`;
  const healthCheck = await loadHealthCheckData(artifacts);
  const summaries = await loadAssertionSummaries(artifacts);
  const logTails = await loadLogTails(artifacts);
  const logInsights = await loadLogInsights(artifacts);
  const maxLogTailChars = readPositiveIntegerEnv("E2E_MAX_LOG_TAIL_CHARS", DEFAULT_MAX_LOG_TAIL_CHARS);
  const maxAssertionSummaryChars = readPositiveIntegerEnv("E2E_MAX_ASSERTION_SUMMARY_CHARS", DEFAULT_MAX_ASSERTION_SUMMARY_CHARS);
  const maxTargetSummaryChars = readPositiveIntegerEnv("E2E_MAX_TARGET_SUMMARY_CHARS", DEFAULT_MAX_TARGET_SUMMARY_CHARS);

  const templatePath = process.env["E2E_TEST_TEMPLATE_PATH"] ?? DEFAULT_E2E_TEMPLATE_PATH;

  if (await fs.exists(templatePath)) {
    try {
      const template = await fs.readText(templatePath);
      const allTargets = [...new Set([...DEFAULT_TARGETS, ...Object.keys(results), ...Object.keys(newmanReports)])].sort((left, right) =>
        left.localeCompare(right),
      );

      const summaryByTarget: Record<string, string> = {};
      for (const [filename, content] of summaries) {
        const target = extractTargetFromSummaryFilename(filename);
        if (!target) {
          continue;
        }

        summaryByTarget[target] = content;
      }

      const logTailByTarget: Record<string, string> = {};
      for (const [filename, content] of logTails) {
        const target = extractTargetFromLogPath(filename);
        if (!target) {
          continue;
        }

        const normalizedContent = content.trim().length > 0 ? content : "(log file is empty)";
        logTailByTarget[target] = truncateText(normalizedContent, maxLogTailChars, "\n...(log tail truncated)");
      }

      const assertionSummariesRaw =
        summaries.length === 0 ? "No assertion summaries available." : summaries.map(([filename, content]) => `### ${filename}\n\n${content}`).join("\n\n");
      const assertionSummariesContent = truncateText(
        assertionSummariesRaw,
        maxAssertionSummaryChars,
        "\n\n...(assertion summaries truncated; see artifacts for full details)",
      );

      const healthJsonContent = typeof healthCheck === "string" ? healthCheck : JSON.stringify(healthCheck, null, 2);

      const templateVariables: Record<string, string> = {
        ASSERTION_SUMMARIES: assertionSummariesContent,
        REPOSITORY: metadata.repository,
        RUN_DATE: metadata.executionDate,
        RUN_ID: metadata.runId,
        RUN_NUMBER: metadata.runNumber,
        SERVER_URL: metadata.serverUrl,
        TARGETS: allTargets.map((target) => capitalizeTarget(target)).join(", "),
        WORKFLOW: metadata.name,
        EVENT_NAME: metadata.eventName,
        HEALTH_JSON: healthJsonContent,
      };

      for (const target of allTargets) {
        const normalizedTarget = target.toLowerCase();
        const targetKey = normalizeTargetKey(normalizedTarget);
        const targetResult = results[normalizedTarget] ?? {duration: "N/A", status: "unknown" as JobStatus};
        const targetReport = newmanReports[normalizedTarget];
        const logInsight = logInsights[normalizedTarget];
        const fallbackSummaryMetrics = parseSummaryTableMetrics(logInsight?.summaryTable ?? null);
        const fallbackMetrics: FallbackTargetMetrics = {
          failureCategories: deriveFallbackFailureCategories(logInsight?.requestStatuses ?? {}, summaryByTarget[normalizedTarget] ?? null),
          failedAssertions: fallbackSummaryMetrics.assertions?.failed ?? null,
          failedRequests: fallbackSummaryMetrics.requests?.failed ?? null,
          source: fallbackSummaryMetrics.assertions || fallbackSummaryMetrics.requests ? "summary-table" : "none",
          totalAssertions: fallbackSummaryMetrics.assertions?.executed ?? null,
          totalRequests: fallbackSummaryMetrics.requests?.executed ?? null,
        };
        const failureCategories = targetReport ? newman.categorizeFailures(targetReport) : fallbackMetrics.failureCategories;
        const targetSummary = targetReport
          ? truncateText(
              newman.generateMarkdownSection(targetReport, capitalizeTarget(normalizedTarget), {includeFailureDetails: false}),
              maxTargetSummaryChars,
              "\n\n...(target summary truncated; see artifacts for full details)",
            )
          : truncateText(
              generateFallbackSummaryMarkdown(capitalizeTarget(normalizedTarget), fallbackMetrics),
              maxTargetSummaryChars,
              "\n\n...(target summary truncated; see artifacts for full details)",
            );

        templateVariables[`${targetKey}_STATUS`] = `${STATUS_EMOJI[targetResult.status]} ${targetResult.status}`;
        templateVariables[`${targetKey}_DURATION`] = targetResult.duration;
        templateVariables[`${targetKey}_FAILED_ASSERTIONS`] = targetReport
          ? String(targetReport.failedAssertions)
          : (fallbackMetrics.failedAssertions !== null ? String(fallbackMetrics.failedAssertions) : "unknown");
        templateVariables[`${targetKey}_FAILED_REQUESTS`] = targetReport
          ? String(targetReport.failedRequests)
          : (fallbackMetrics.failedRequests !== null ? String(fallbackMetrics.failedRequests) : "unknown");
        templateVariables[`${targetKey}_NEWMAN_SUMMARY`] = targetSummary;
        templateVariables[`${targetKey}_CLIENT_ERRORS`] = failureCategories ? String(failureCategories.clientErrors) : "unknown";
        templateVariables[`${targetKey}_SERVER_ERRORS`] = failureCategories ? String(failureCategories.serverErrors) : "unknown";
        templateVariables[`${targetKey}_TIMEOUTS`] = failureCategories ? String(failureCategories.timeouts) : "unknown";
        templateVariables[`${targetKey}_ASSERTION_FAILURES`] = failureCategories ? String(failureCategories.assertionFailures) : "unknown";
        templateVariables[`${targetKey}_OTHER_FAILURES`] = failureCategories ? String(failureCategories.other) : "unknown";
        templateVariables[`${targetKey}_LOG_TAIL`] = logTailByTarget[normalizedTarget] ?? "No Newman summary table found in this target log.";
      }

      const renderedTemplate = fillTemplatePlaceholders(template, templateVariables);
      return enforceIssueBodyLimit(renderedTemplate, metadata, results, newmanReports);
    } catch (error) {
      console.warn(`Failed to render E2E issue template at ${templatePath}, falling back to generated markdown:`, error);
    }
  }

  let body = "";
  body += generateIssueHeader(metadata);
  body += generateJobStatusTable(results);

  for (const target of Object.keys(newmanReports).sort((left, right) => left.localeCompare(right))) {
    body += newman.generateMarkdownSection(newmanReports[target]!, capitalizeTarget(target));
  }

  if (Object.keys(newmanReports).length > 0) {
    body += "\n## 📊 Failure Analysis\n\n";

    for (const target of Object.keys(newmanReports).sort((left, right) => left.localeCompare(right))) {
      const categories = newman.categorizeFailures(newmanReports[target]!);
      body += `### ${capitalizeTarget(target)} Failure Breakdown\n\n`;
      body += `- **Client Errors (4xx):** ${categories.clientErrors}\n`;
      body += `- **Server Errors (5xx):** ${categories.serverErrors}\n`;
      body += `- **Timeouts:** ${categories.timeouts}\n`;
      body += `- **Assertion Failures:** ${categories.assertionFailures}\n`;
      body += `- **Other Errors:** ${categories.other}\n\n`;
    }
  }

  body += generateHealthCheckSection(healthCheck);
  body += generateArtifactsSection(workflowUrl);
  body += generateNextStepsSection();

  body += generateAssertionSummaries(summaries);

  body += generateLogTailSection(logTails);

  return enforceIssueBodyLimit(body, metadata, results, newmanReports);
}

function hasFailures(results: E2ETestResults): boolean {
  return Object.values(results).some((result) => result.status === "failure" || result.status === "unknown");
}

export default async function runLiveTestAction(): Promise<void> {
  const github = await import("@actions/github");
  const octokit = github.getOctokit(process.env["GITHUB_TOKEN"] ?? "");
  const context = github.context;
  const core = await import("@actions/core");

  try {
    core.info("🚀 Starting E2E failure issue creation process...");

    const metadata = extractWorkflowMetadata(context);
    const targets = parseTargetsFromEnvironment();
    core.info(`📋 Workflow: ${metadata.name}, targets: ${targets.join(", ")}`);

    const artifactsBaseDir = process.env["ARTIFACTS_DIR"] ?? DEFAULT_ARTIFACTS_DIR;
    const artifacts = await discoverTestArtifacts(artifactsBaseDir);
    const baseResults = extractTestResults(targets);
    const statusResults = await loadStatusArtifacts(artifacts);
    const newmanReports = await loadNewmanReports(artifacts);
    const results = mergeResults(targets, baseResults, statusResults, newmanReports);

    core.info(
      `📊 Artifact summary: ${artifacts.logs.length} logs, ${artifacts.reports.length} reports, ${artifacts.summaries.length} summaries, ${artifacts.statuses.length} statuses`,
    );

    if (!hasFailures(results)) {
      core.notice("✓ No test failures detected. Skipping issue creation.");
      return;
    }

    const issueBody = await generateIssueBody(metadata, results, artifacts, newmanReports);
    const issueTitle = `[${metadata.executionDate}] Hourly Live Test Failed 🚨`;

    const searchQuery = `is:issue repo:${context.repo.owner}/${context.repo.repo} in:title "${metadata.executionDate}" label:${AUTOMATED_TEST_FAILURE_LABELS[0]}`;
    const searchResults = await octokit.rest.search.issuesAndPullRequests({
      order: "desc",
      per_page: 10,
      q: searchQuery,
      sort: "created",
    });

    const openIssues = searchResults.data.items.filter((issue) => issue.state === "open");
    if (openIssues.length > 0) {
      core.warning(`⏭️ Existing open issue found: #${openIssues[0]!.number}. Skipping duplicate creation.`);
      return;
    }

    const issueResponse = await octokit.rest.issues.create({
      assignees: ["arolariu"],
      body: issueBody,
      labels: [...AUTOMATED_TEST_FAILURE_LABELS],
      owner: context.repo.owner,
      repo: context.repo.repo,
      title: issueTitle,
    });

    core.notice(`Created E2E test failure issue: ${issueResponse.data.html_url}`);
  } catch (error) {
    const err = error as Error;
    core.error(`❌ E2E failure issue creation failed: ${err.message}`);
    core.error(`Stack trace: ${err.stack ?? "No stack trace available"}`);
    core.setFailed(`Failed to create E2E test failure issue: ${err.message}`);
    throw error;
  }
}
