/** Test-owned versioned evidence built from actual registry/plan contracts. */
import {buildHygienePlan} from "../../planning/plan.ts";
import {changes, context, workspace} from "../../planning/fixtures/plans.ts";
import type {HygienePlan} from "../../planning/types.ts";
import type {VersionedProviderOutcome} from "../contracts.ts";
import {providerDescriptor, type ProviderId} from "../registry.ts";

export function plan(empty = false): HygienePlan {
  return buildHygienePlan({
    context: context(),
    mode: "affected",
    changes: changes(empty ? [] : [{kind: "modified", path: "nx.json"}]),
    workspace: workspace(),
    sharedInputs: ["{workspaceRoot}/nx.json"],
  });
}
export function outcome(
  plan: HygienePlan,
  id: ProviderId,
  overrides: Partial<VersionedProviderOutcome<unknown>> = {},
): VersionedProviderOutcome<unknown> {
  const descriptor = providerDescriptor(id);
  const planned = plan.providers.find((provider) => provider.id === id);
  if (!planned) throw new Error("Fixture provider is not planned");
  let payload: unknown;
  if (id === "format") payload = {unformattedCount: 0, unformattedFiles: []};
  else if (id === "lint") payload = {errorCount: 0, warningCount: 0, filesChecked: 1};
  else if (id === "stats")
    payload = {filesChanged: 1, linesAdded: 0, linesDeleted: 0, topExtensions: [], topDirectories: [], bundleSizes: []};
  else
    payload = {
      totalTests: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      suites: (id === "test-typescript" ? plan.suites : [id === "test-dotnet" ? "dotnet" : "python"]).map((name) => ({
        name,
        totalTests: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        findings: [],
      })),
    };
  return {
    schemaVersion: "1",
    providerId: id,
    providerName: descriptor.name,
    providerIcon: descriptor.icon,
    gate: descriptor.defaultGate,
    gateResult: "passed",
    durationMs: 1,
    startedAt: "2026-01-01T00:00:00Z",
    finishedAt: "2026-01-01T00:00:00.001Z",
    payload: planned.selected ? payload : null,
    findings: [],
    error: null,
    commitSha: plan.commitSha,
    workflowRunId: plan.workflowRunId,
    workflowRunAttempt: 1,
    planId: plan.id,
    executionStatus: planned.selected ? "passed" : "skipped",
    evidenceStatus: "complete",
    ...(planned.selected ? {} : {skipReason: planned.reason}),
    ...overrides,
  };
}
