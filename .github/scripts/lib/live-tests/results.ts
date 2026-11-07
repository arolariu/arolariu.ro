/**
 * @fileoverview Live execution truth and incident eligibility, independent of publication.
 * @module github/scripts/lib/live-tests/results
 */
import type {NewmanExecutionStats} from "../../helpers/newman/index.ts";

export type JobStatus = "success" | "failure" | "cancelled" | "skipped" | "unknown";
export type LiveTarget = "frontend" | "backend" | "cv";
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
/** Explicit evidence problem; rejected values are never echoed. */
export interface LiveDiagnostic {
  readonly code: string;
  readonly message: string;
  readonly target?: LiveTarget;
  readonly sourcePath?: string;
}
/** One redacted log read supplies all three presentation/analysis views. */
export interface LogEvidence {
  readonly summaryTable: string | null;
  readonly requestStatuses: Readonly<Record<string, number>>;
  readonly excerpt: string;
}
export interface LiveEvidence {
  readonly statuses: E2ETestResults;
  readonly reports: Readonly<Partial<Record<LiveTarget, NewmanExecutionStats>>>;
  readonly completeness: Readonly<Partial<Record<LiveTarget, "complete" | "missing" | "invalid" | "partial">>>;
  readonly summaries: Readonly<Partial<Record<LiveTarget, string>>>;
  readonly logs: Readonly<Partial<Record<LiveTarget, LogEvidence>>>;
  readonly health: Readonly<Record<string, unknown>> | string | null;
  readonly templateText?: string;
  readonly diagnostics: readonly LiveDiagnostic[];
}
/** Reduced execution verdict plus intact evidence for pure rendering. */
export interface LiveReport {
  readonly evidence: LiveEvidence;
  readonly results: E2ETestResults;
  readonly hasFailures: boolean;
  readonly diagnostics: readonly LiveDiagnostic[];
}

/**
 * Normalizes only documented job statuses; unfamiliar supplied values stay unknown.
 * @param value - Environment or artifact status.
 * @returns A closed execution state, never a success-shaped default.
 */
export function jobStatus(value: unknown): JobStatus {
  if (typeof value !== "string") return "unknown";
  switch (value.toLowerCase()) {
    case "success":
      return "success";
    case "failure":
      return "failure";
    case "cancelled":
      return "cancelled";
    case "skipped":
      return "skipped";
    default:
      return "unknown";
  }
}

/**
 * Parses per-target execution metadata without reading ambient environment.
 * @param targets - Requested target identities.
 * @param variables - Explicit environment snapshot.
 * @returns Execution states/durations with unresolved values kept unknown.
 */
export function readTargetStatuses(targets: readonly string[], variables: Readonly<Record<string, string | undefined>>): E2ETestResults {
  return Object.fromEntries(
    targets.map((target) => {
      const key = target.replaceAll(/[^a-zA-Z0-9]/g, "_").toUpperCase();
      return [target, {status: jobStatus(variables[`${key}_STATUS`]), duration: variables[`${key}_DURATION`] ?? "N/A"}];
    }),
  );
}

/**
 * Gives explicit execution failure/cancellation/skip precedence over assertion metrics.
 * @param targets - Selected targets, not stale/unselected artifact identities.
 * @param evidence - Validated bounded evidence.
 * @returns Failure/unknown incident eligibility under the existing policy.
 */
export function reduceLiveResults(targets: readonly LiveTarget[], evidence: LiveEvidence): LiveReport {
  const diagnostics: LiveDiagnostic[] = [...evidence.diagnostics];
  const results: Record<string, TargetTestResult> = {};
  for (const target of targets) {
    const initial = evidence.statuses[target] ?? {status: "unknown", duration: "N/A"};
    const report = evidence.reports[target];
    const completeness = evidence.completeness[target] ?? "missing";
    if (completeness !== "complete" && !diagnostics.some((issue) => issue.target === target && issue.code === "incomplete-target"))
      diagnostics.push({code: "incomplete-target", target, message: `Selected target evidence is ${completeness}`});
    let status = initial.status;
    if (status !== "failure" && status !== "cancelled" && status !== "skipped") {
      if (completeness === "invalid") status = "unknown";
      else if (report && (report.failedRequests > 0 || report.failedAssertions > 0)) status = "failure";
    }
    results[target] = {status, duration: report ? `${(report.timings.totalDuration / 1000).toFixed(2)}s` : initial.duration};
  }
  return {
    evidence,
    results,
    hasFailures: Object.values(results).some((result) => result.status === "failure" || result.status === "unknown"),
    diagnostics,
  };
}
