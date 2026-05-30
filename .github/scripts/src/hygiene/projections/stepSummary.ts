/**
 * @fileoverview Step Summary projection -- writes to GITHUB_STEP_SUMMARY.
 * @module github/scripts/src/hygiene/projections/stepSummary
 *
 * @remarks
 * Uses helpers/comments/CommentBuilder for consistent markdown generation.
 */

import * as core from "@actions/core";
import {CommentBuilder} from "../../../helpers/comments/index.ts";
import type {GateResult, HygieneReport, ProviderOutcome} from "../domain/types.ts";

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

  return cb.build();
}

export async function writeStepSummary(report: HygieneReport): Promise<void> {
  const md = buildStepSummary(report);
  await core.summary.addRaw(md).write();
}
