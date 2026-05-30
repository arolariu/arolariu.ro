/**
 * @fileoverview Step Summary projection -- writes to GITHUB_STEP_SUMMARY.
 * @module github/scripts/src/hygiene/projections/stepSummary
 *
 * @remarks
 * Uses helpers/comments/CommentBuilder for consistent markdown generation.
 */

import * as core from "@actions/core";
import {CommentBuilder} from "../../../helpers/comments/index.ts";
import {severityRank, type Finding, type GateResult, type HygieneReport, type ProviderOutcome, type Severity} from "../domain/types.ts";

/** Max number of findings to render per provider in the comment / step summary. */
const MAX_FINDINGS_PER_PROVIDER = 25;

function resultIcon(r: GateResult): string {
  switch (r) {
    case "passed": return "✅";
    case "advisory": return "ℹ️";
    case "failed": return "❌";
    case "errored": return "💥";
  }
}

function resultBadge(r: GateResult): string {
  switch (r) {
    case "passed": return "passed";
    case "advisory": return "advisory";
    case "failed": return "failed";
    case "errored": return "errored";
  }
}

function severityIcon(s: Severity): string {
  switch (s) {
    case "critical": return "🟥";
    case "error": return "🔴";
    case "warning": return "🟡";
    case "notice": return "🔵";
    case "info": return "⚪";
  }
}

function formatDurationMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function outcomeRowCells(o: ProviderOutcome<unknown>): string[] {
  const errorCount = o.findings.filter((f) => f.severity === "error" || f.severity === "critical").length;
  const warnCount = o.findings.filter((f) => f.severity === "warning").length;
  return [
    `${o.providerIcon} ${o.providerName}`,
    `${resultIcon(o.gateResult)} ${resultBadge(o.gateResult)}`,
    `${o.findings.length} finding(s) (${errorCount} err / ${warnCount} warn)`,
    formatDurationMs(o.durationMs),
  ];
}

/**
 * Renders a single Finding as one line of markdown suitable for inclusion in a
 * bullet list. Discriminates on `kind` and produces a readable, drillable representation.
 */
export function formatFinding(f: Finding): string {
  const sev = severityIcon(f.severity);
  switch (f.kind) {
    case "line": {
      const rule = f.ruleId ? ` \`${f.ruleId}\`` : "";
      const loc = `${f.file}:${f.line}:${f.column}`;
      return `${sev} \`${loc}\`${rule} — ${f.message}`;
    }
    case "file": {
      const rule = f.ruleId ? ` \`${f.ruleId}\`` : "";
      return `${sev} \`${f.file}\`${rule} — ${f.message}`;
    }
    case "metric": {
      const unit = f.unit ?? "";
      const threshold = f.threshold !== undefined ? ` (threshold ${f.threshold}${unit})` : "";
      return `${sev} **${f.name}** = ${f.value}${unit}${threshold} — ${f.message}`;
    }
    case "comparison": {
      const unit = f.unit ?? "";
      const sign = f.diff >= 0 ? "+" : "";
      return `${sev} **${f.name}**: ${f.baseValue}${unit} → ${f.headValue}${unit} (${sign}${f.diff}${unit}) — ${f.message}`;
    }
    case "tabular": {
      return `${sev} **${f.name}** (${f.rows.length} row(s)) — ${f.message}`;
    }
  }
}

function sortFindings(findings: readonly Finding[]): Finding[] {
  const copy = [...findings];
  copy.sort((a, b) => {
    const sevDiff = severityRank(b.severity) - severityRank(a.severity);
    if (sevDiff !== 0) return sevDiff;
    const aFile = "file" in a ? a.file : "name" in a ? a.name : "";
    const bFile = "file" in b ? b.file : "name" in b ? b.name : "";
    return aFile.localeCompare(bFile);
  });
  return copy;
}

/**
 * Builds the markdown block describing the findings for a single provider.
 * Includes a summary line and a bulleted list capped at MAX_FINDINGS_PER_PROVIDER.
 */
export function findingsBlock(o: ProviderOutcome<unknown>): string {
  if (o.findings.length === 0) return "_No findings._";
  const sorted = sortFindings(o.findings);
  const shown = sorted.slice(0, MAX_FINDINGS_PER_PROVIDER);
  const lines: string[] = [];
  for (const f of shown) {
    lines.push(`- ${formatFinding(f)}`);
  }
  if (sorted.length > shown.length) {
    lines.push("");
    lines.push(`> Showing top ${shown.length} of ${sorted.length} findings (sorted by severity). Full list in the \`hygiene-report\` artifact.`);
  }
  return lines.join("\n");
}

export function buildStepSummary(report: HygieneReport): string {
  const cb = new CommentBuilder();
  cb.addHeading("🧹 Code Hygiene Check", 1);
  cb.addParagraph(`**Overall:** ${resultIcon(report.overallResult)} \`${resultBadge(report.overallResult)}\` &nbsp;|&nbsp; **Commit:** \`${report.commitSha.substring(0, 7)}\` &nbsp;|&nbsp; **Run:** [#${report.workflowRunId}](${report.workflowRunUrl})`);
  cb.addRule();

  cb.addHeading("Providers", 2);
  cb.addTable(
    [
      {header: "Provider", align: "left"},
      {header: "Result", align: "center"},
      {header: "Findings", align: "left"},
      {header: "Duration", align: "right"},
    ],
    report.outcomes.map((o) => outcomeRowCells(o)),
  );

  // Errored providers get their error message surfaced.
  const errored = report.outcomes.filter((o) => o.gateResult === "errored");
  if (errored.length > 0) {
    cb.addHeading("💥 Errored Providers", 2);
    for (const o of errored) {
      cb.addCollapsible(
        `${o.providerIcon} ${o.providerName}`,
        "```\n" + (o.error?.message ?? "Unknown error") + "\n```",
        false,
      );
    }
  }

  // Findings details: for any provider with non-zero findings, render the actual
  // findings (file:line, rule, message) so consumers can act on them without
  // downloading the artifact.
  const withFindings = report.outcomes.filter((o) => o.findings.length > 0);
  if (withFindings.length > 0) {
    cb.addHeading("🔎 Findings details", 2);
    for (const o of withFindings) {
      const errorCount = o.findings.filter((f) => f.severity === "error" || f.severity === "critical").length;
      const warnCount = o.findings.filter((f) => f.severity === "warning").length;
      const title = `${o.providerIcon} ${o.providerName} — ${o.findings.length} finding(s) (${errorCount} err / ${warnCount} warn)`;
      // Failed/errored providers default to open so users see the data immediately.
      const collapsed = o.gateResult === "passed" || o.gateResult === "advisory";
      cb.addCollapsible(title, findingsBlock(o), collapsed);
    }
  }

  return cb.build();
}

export async function writeStepSummary(report: HygieneReport): Promise<void> {
  const md = buildStepSummary(report);
  await core.summary.addRaw(md).write();
}
