/**
 * @fileoverview Completeness-first aggregation with plan-owned identity and gate policy.
 * @module github/scripts/lib/hygiene/aggregate
 */
import type {WorkflowContext} from "../context.ts";
import type {HygienePlan} from "../planning/types.ts";
import type {EvidenceIssue, GateResult, HygieneReport, VersionedProviderOutcome} from "./contracts.ts";
import {decodeProviderOutcome, type LoadedOutcomes} from "./outcomes.ts";

/**
 * Verifies every required record before calculating the existing report verdict.
 * @param context - Validated current run/commit/attempt identity.
 * @param plan - Validated shared selection, including explicit skipped providers.
 * @param loaded - Available selected records and all loading diagnostics.
 * @returns Version-3 report with additive plan/issues; empty evidence never passes.
 * @throws TypeError when the report context does not belong to this plan.
 */
export function buildVerifiedReport(context: WorkflowContext, plan: HygienePlan, loaded: LoadedOutcomes): HygieneReport {
  if (context.commitSha.toLowerCase() !== plan.commitSha || context.workflowRunId !== plan.workflowRunId)
    throw new TypeError("Report context does not match the hygiene plan");
  const issues: EvidenceIssue[] = [...loaded.issues];
  const accepted = new Map<string, VersionedProviderOutcome<unknown>>();
  for (const value of loaded.outcomes) {
    try {
      const decoded = decodeProviderOutcome(value, plan);
      if (decoded.workflowRunAttempt > context.workflowRunAttempt) {
        issues.push({code: "future-attempt", message: "Selected outcome originates from a future attempt", providerId: decoded.providerId});
      } else if (accepted.has(decoded.providerId)) {
        issues.push({
          code: "duplicate-selected-outcome",
          message: "More than one outcome selected for the provider",
          providerId: decoded.providerId,
        });
      } else accepted.set(decoded.providerId, decoded);
    } catch (error) {
      issues.push({
        code: "invalid-outcome",
        message: error instanceof Error ? error.message : "Invalid selected outcome",
        providerId: value.providerId,
      });
    }
  }
  for (const provider of plan.providers) {
    if (!accepted.has(provider.id) && !issues.some((issue) => issue.code === "missing-outcome" && issue.providerId === provider.id)) {
      issues.push({code: "missing-outcome", message: "Required provider outcome is missing or unusable", providerId: provider.id});
    }
  }
  const outcomes = plan.providers.flatMap((provider) => {
    const value = accepted.get(provider.id);
    return value ? [value] : [];
  });
  let overallResult: GateResult = "passed";
  if (issues.length > 0 || outcomes.some((outcome) => outcome.gateResult === "errored")) overallResult = "errored";
  else if (outcomes.some((outcome) => outcome.gateResult === "failed")) overallResult = "failed";
  else if (outcomes.some((outcome) => outcome.gateResult === "advisory")) overallResult = "advisory";
  return {
    schemaVersion: "3",
    commitSha: context.commitSha,
    prNumber: context.prNumber,
    workflowRunId: context.workflowRunId,
    workflowRunAttempt: context.workflowRunAttempt,
    workflowRunUrl: context.workflowRunUrl,
    generatedAt: context.generatedAt,
    overallResult,
    outcomes,
    plan,
    evidenceIssues: issues,
  };
}
