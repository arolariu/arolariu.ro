/**
 * @fileoverview Pure live-report rendering preserving the existing template and compact policy.
 * @module github/scripts/lib/live-tests/render
 */
import {newman, type FailureCategories, type NewmanExecutionStats} from "../../helpers/newman/index.ts";
import {parseSummaryFailuresByRequest, parseSummaryTableMetrics} from "../../helpers/newman/logs.ts";
import {STATUS_EMOJI} from "../../helpers/constants.ts";
import {MarkdownUtils} from "../../helpers/comments/index.ts";
import {redactEvidenceText} from "../../helpers/reports/redact.ts";
import type {WorkflowContext} from "../context.ts";
import {DEFAULT_TARGETS, type LiveConfiguration} from "./config.ts";
import type {E2ETestResults, JobStatus, LiveReport, WorkflowMetadata} from "./results.ts";

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
  return template.replace(
    /```([^\r\n`]*)\r?\n\$([A-Z0-9_]+)\r?\n```|\$([A-Z0-9_]+)/g,
    (_match, language: string | undefined, block: string | undefined, inline: string | undefined) =>
      block ? MarkdownUtils.fence(variables[block] ?? "N/A", language ?? "") : (variables[inline ?? ""] ?? "N/A"),
  );
}

function truncateText(content: string, maxChars: number, suffix: string): string {
  if (!Number.isSafeInteger(maxChars) || maxChars <= 0) throw new RangeError("Invalid live report character limit");
  if (content.length <= maxChars) {
    return content;
  }

  const availableChars = Math.max(0, maxChars - suffix.length);
  return content.slice(0, availableChars) + suffix.slice(0, maxChars);
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
  body += "3. Reproduce locally with `npm run test:e2e:<target>`\n";

  return body;
}

function enforceIssueBodyLimit(
  body: string,
  metadata: WorkflowMetadata,
  results: E2ETestResults,
  newmanReports: Readonly<Record<string, NewmanExecutionStats>>,
  maxIssueBodyChars: number,
): string {
  if (body.length <= maxIssueBodyChars) {
    return body;
  }

  const compactBody = generateCompactIssueBody(metadata, results, newmanReports);
  if (compactBody.length <= maxIssueBodyChars) {
    return compactBody;
  }

  return truncateText(compactBody, maxIssueBodyChars, "\n\n...(trimmed due to issue size limit)");
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
    table += `| ${MarkdownUtils.tableCell(capitalizeTarget(target))} | ${statusEmoji} ${result.status} | ${MarkdownUtils.tableCell(result.duration)} |\n`;
  }

  table += "\n---\n\n";
  return table;
}

function generateHealthCheckSection(healthCheck: Readonly<Record<string, unknown>> | string | null): string {
  let section = "## 🏥 Backend Health Check\n\n";

  if (typeof healthCheck === "string") {
    section += `${healthCheck}\n\n`;
  } else {
    section += `${MarkdownUtils.fence(JSON.stringify(healthCheck, null, 2), "json")}\n\n`;
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
    section += `${MarkdownUtils.fence(content)}\n\n`;
  }

  return section;
}

/**
 * Renders only collected evidence; it performs no filesystem/environment/API reads.
 * @param context - Validated immutable run identity and UTC timestamp.
 * @param report - Reduced execution truth and redacted evidence.
 * @param configuration - Explicit legacy-compatible presentation budgets.
 * @returns Existing template/fallback/compact Markdown within the configured ceiling.
 */
export function renderLiveIssue(context: WorkflowContext, report: LiveReport, configuration: LiveConfiguration): string {
  const metadata: WorkflowMetadata = {
    eventName: context.eventName,
    executionDate: context.generatedAt.slice(0, 10),
    name: context.workflowName,
    repository: `${context.repoOwner}/${context.repoName}`,
    runId: context.workflowRunId,
    runNumber: context.workflowRunNumber,
    serverUrl: context.serverUrl,
  };
  const results = report.results;
  const newmanReports: Record<string, NewmanExecutionStats> = {};
  const summaries: Array<[string, string]> = [];
  const logTails: Array<[string, string]> = [];
  for (const target of configuration.targets) {
    const parsed = report.evidence.reports[target];
    if (parsed) newmanReports[target] = parsed;
    const summary = report.evidence.summaries[target];
    if (summary !== undefined) summaries.push([`newman-${target}-summary.md`, redactEvidenceText(summary)]);
    const log = report.evidence.logs[target];
    if (log)
      logTails.push([`e2e-${target}.log`, redactEvidenceText(log.summaryTable ?? "No Newman CLI summary table found in this target log.")]);
  }
  const workflowUrl = `${metadata.serverUrl}/${metadata.repository}/actions/runs/${metadata.runId}`;
  const healthCheck = report.evidence.health ?? "No health data available";
  const logInsights = report.evidence.logs;
  const {maxLogTailChars, maxAssertionSummaryChars, maxTargetSummaryChars} = configuration;
  const template = report.evidence.templateText;
  if (template !== undefined) {
    const allTargets = [...new Set([...DEFAULT_TARGETS, ...Object.keys(results), ...Object.keys(newmanReports)])].sort((left, right) =>
      left.localeCompare(right),
    );

    const summaryByTarget: Record<string, string> = {...report.evidence.summaries};

    const logTailByTarget: Record<string, string> = {};
    for (const target of configuration.targets) {
      const log = report.evidence.logs[target];
      if (!log) continue;
      const content = log.summaryTable ?? "No Newman CLI summary table found in this target log.";
      const normalizedContent = content.trim().length > 0 ? content : "(log file is empty)";
      logTailByTarget[target] = truncateText(normalizedContent, maxLogTailChars, "\n...(log tail truncated)");
    }

    const assertionSummariesRaw =
      summaries.length === 0
        ? "No assertion summaries available."
        : summaries.map(([filename, content]) => `### ${filename}\n\n${content}`).join("\n\n");
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
      const logInsight =
        normalizedTarget === "frontend" || normalizedTarget === "backend" || normalizedTarget === "cv"
          ? logInsights[normalizedTarget]
          : undefined;
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
      templateVariables[`${targetKey}_DURATION`] = MarkdownUtils.tableCell(targetResult.duration);
      templateVariables[`${targetKey}_FAILED_ASSERTIONS`] = targetReport
        ? String(targetReport.failedAssertions)
        : fallbackMetrics.failedAssertions !== null
          ? String(fallbackMetrics.failedAssertions)
          : "unknown";
      templateVariables[`${targetKey}_FAILED_REQUESTS`] = targetReport
        ? String(targetReport.failedRequests)
        : fallbackMetrics.failedRequests !== null
          ? String(fallbackMetrics.failedRequests)
          : "unknown";
      templateVariables[`${targetKey}_NEWMAN_SUMMARY`] = targetSummary;
      templateVariables[`${targetKey}_CLIENT_ERRORS`] = failureCategories ? String(failureCategories.clientErrors) : "unknown";
      templateVariables[`${targetKey}_SERVER_ERRORS`] = failureCategories ? String(failureCategories.serverErrors) : "unknown";
      templateVariables[`${targetKey}_TIMEOUTS`] = failureCategories ? String(failureCategories.timeouts) : "unknown";
      templateVariables[`${targetKey}_ASSERTION_FAILURES`] = failureCategories ? String(failureCategories.assertionFailures) : "unknown";
      templateVariables[`${targetKey}_OTHER_FAILURES`] = failureCategories ? String(failureCategories.other) : "unknown";
      templateVariables[`${targetKey}_LOG_TAIL`] = logTailByTarget[normalizedTarget] ?? "No Newman summary table found in this target log.";
    }

    const renderedTemplate = fillTemplatePlaceholders(template, templateVariables);
    return enforceIssueBodyLimit(redactEvidenceText(renderedTemplate), metadata, results, newmanReports, configuration.maxIssueBodyChars);
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

  if (report.diagnostics.length > 0)
    body += `\n## Evidence Diagnostics\n\n${report.diagnostics.map((issue) => `- ${issue.target ? `${issue.target}: ` : ""}${issue.code}: ${issue.message}`).join("\n")}\n`;
  return enforceIssueBodyLimit(redactEvidenceText(body), metadata, results, newmanReports, configuration.maxIssueBodyChars);
}
