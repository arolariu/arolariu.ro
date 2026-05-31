/**
 * @fileoverview Pure factory that aggregates provider outcomes into a HygieneReport.
 * @module github/scripts/src/hygiene/domain/buildReport
 */

import type {GateResult, HygieneReport, ProviderOutcome} from "./types.ts";

/**
 * Inputs needed to build a report. Everything is data; no I/O.
 */
export interface BuildReportInput {
  readonly outcomes: readonly ProviderOutcome<unknown>[];
  readonly commitSha: string;
  readonly prNumber: number | null;
  readonly workflowRunId: string;
  readonly workflowRunUrl: string;
}

/**
 * Aggregates per-provider outcomes into a single HygieneReport.
 *
 * Aggregation rules for overallResult (highest-severity-wins):
 *   any errored -> "errored"
 *   any failed  -> "failed"
 *   any advisory -> "advisory"
 *   else        -> "passed"
 */
export function buildReport(input: BuildReportInput): HygieneReport {
  const overallResult = aggregateResult(input.outcomes);
  return {
    schemaVersion: "3",
    commitSha: input.commitSha,
    prNumber: input.prNumber,
    workflowRunId: input.workflowRunId,
    workflowRunUrl: input.workflowRunUrl,
    generatedAt: new Date().toISOString(),
    overallResult,
    outcomes: input.outcomes,
  };
}

function aggregateResult(outcomes: readonly ProviderOutcome<unknown>[]): GateResult {
  if (outcomes.some((o) => o.gateResult === "errored")) return "errored";
  if (outcomes.some((o) => o.gateResult === "failed")) return "failed";
  if (outcomes.some((o) => o.gateResult === "advisory")) return "advisory";
  return "passed";
}
