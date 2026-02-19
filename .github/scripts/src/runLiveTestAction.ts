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
  DEFAULT_LOG_TAIL_LENGTH,
  HEALTH_CHECK_FILENAME,
  STATUS_EMOJI,
  fs,
  newman,
} from "../helpers/index.ts";
import type {NewmanExecutionStats, NewmanReport} from "../helpers/newman/index.ts";

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

function fillTemplatePlaceholders(template: string, variables: Readonly<Record<string, string>>): string {
  return template.replace(TEMPLATE_PLACEHOLDER_REGEX, (_match, key: string) => variables[key] ?? "N/A");
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
  section += "3. Inspect Newman JSON reports for failing assertions and status mismatches\n";
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

  let section = `## 📄 Log Tails (Last ${DEFAULT_LOG_TAIL_LENGTH} Lines)\n\n`;

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

async function loadLogTails(artifacts: TestArtifactPaths, tailLength: number = DEFAULT_LOG_TAIL_LENGTH): Promise<Array<[string, string]>> {
  const logTails: Array<[string, string]> = [];

  for (const logPath of [...artifacts.logs].sort((left, right) => left.localeCompare(right))) {
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

  const templatePath = process.env["E2E_TEST_TEMPLATE_PATH"] ?? DEFAULT_E2E_TEMPLATE_PATH;

  if (await fs.exists(templatePath)) {
    try {
      const template = await fs.readText(templatePath);
      const allTargets = [...new Set([...DEFAULT_TARGETS, ...Object.keys(results), ...Object.keys(newmanReports)])].sort((left, right) =>
        left.localeCompare(right),
      );

      const logTailByTarget: Record<string, string> = {};
      for (const [filename, content] of logTails) {
        const target = extractTargetFromLogPath(filename);
        if (!target) {
          continue;
        }

        const normalizedContent = content.trim().length > 0 ? content : "(log file is empty)";
        logTailByTarget[target] = normalizedContent;
      }

      const assertionSummariesContent =
        summaries.length === 0 ? "No assertion summaries available." : summaries.map(([filename, content]) => `### ${filename}\n\n${content}`).join("\n\n");

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
        const failureCategories = targetReport ? newman.categorizeFailures(targetReport) : null;
        const targetSummary = targetReport
          ? newman.generateMarkdownSection(targetReport, capitalizeTarget(normalizedTarget))
          : "No Newman report captured for this target.";

        templateVariables[`${targetKey}_STATUS`] = `${STATUS_EMOJI[targetResult.status]} ${targetResult.status}`;
        templateVariables[`${targetKey}_DURATION`] = targetResult.duration;
        templateVariables[`${targetKey}_FAILED_ASSERTIONS`] = targetReport ? String(targetReport.failedAssertions) : "N/A";
        templateVariables[`${targetKey}_FAILED_REQUESTS`] = targetReport ? String(targetReport.failedRequests) : "N/A";
        templateVariables[`${targetKey}_NEWMAN_SUMMARY`] = targetSummary;
        templateVariables[`${targetKey}_CLIENT_ERRORS`] = failureCategories ? String(failureCategories.clientErrors) : "N/A";
        templateVariables[`${targetKey}_SERVER_ERRORS`] = failureCategories ? String(failureCategories.serverErrors) : "N/A";
        templateVariables[`${targetKey}_TIMEOUTS`] = failureCategories ? String(failureCategories.timeouts) : "N/A";
        templateVariables[`${targetKey}_ASSERTION_FAILURES`] = failureCategories ? String(failureCategories.assertionFailures) : "N/A";
        templateVariables[`${targetKey}_OTHER_FAILURES`] = failureCategories ? String(failureCategories.other) : "N/A";
        templateVariables[`${targetKey}_LOG_TAIL`] = logTailByTarget[normalizedTarget] ?? "No log tail available.";
      }

      return fillTemplatePlaceholders(template, templateVariables);
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

  return body;
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
