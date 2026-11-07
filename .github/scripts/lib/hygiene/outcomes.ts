/**
 * @fileoverview Versioned evidence decoding, nested discovery, and compatible rerun selection.
 * @module github/scripts/lib/hygiene/outcomes
 */
import {fs} from "../../helpers/filesystem/index.ts";
import {array, count, finite, MAX_REPORT_BYTES, record, text} from "../../helpers/reports/validation.ts";
import type {HygienePlan} from "../planning/types.ts";
import {flattenSuiteFindings, testSuitesPayloadSchema} from "../testing/suites.ts";
import {
  decodeFinding,
  evaluateGate,
  type EvidenceIssue,
  type EvidenceStatus,
  type ExecutionStatus,
  type Finding,
  type ProviderError,
  type VersionedProviderOutcome,
} from "./contracts.ts";
import {formatPayloadSchema, lintPayloadSchema, statsPayloadSchema} from "./payloads.ts";
import {decodeProviderId, providerDescriptor, type ProviderId} from "./registry.ts";

export type {EvidenceIssue, VersionedProviderOutcome} from "./contracts.ts";

/** Selected valid records and every diagnostic; never just a filtered-success list. */
export interface LoadedOutcomes {
  readonly outcomes: readonly VersionedProviderOutcome<unknown>[];
  readonly issues: readonly EvidenceIssue[];
}

interface Candidate {
  readonly outcome: VersionedProviderOutcome<unknown>;
  readonly sourcePath: string;
}

function timestamp(value: unknown, field: string): string {
  const result = text(value, field);
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(result) || !Number.isFinite(Date.parse(result)))
    throw new TypeError(`Invalid ${field}`);
  return result;
}
function execution(value: unknown): ExecutionStatus {
  switch (value) {
    case "passed":
    case "failed":
    case "errored":
    case "skipped":
    case "cancelled":
      return value;
    default:
      throw new TypeError("Invalid outcome execution status");
  }
}
function completeness(value: unknown): EvidenceStatus {
  switch (value) {
    case "complete":
    case "missing":
    case "invalid":
    case "partial":
      return value;
    default:
      throw new TypeError("Invalid outcome evidence status");
  }
}
function providerError(value: unknown): ProviderError | null {
  if (value === null) return null;
  const raw = record(value, "provider error");
  return {
    message: text(raw["message"], "provider error message"),
    ...(raw["stack"] === undefined ? {} : {stack: text(raw["stack"], "provider error stack")}),
  };
}

function payload(id: ProviderId, value: unknown, plan: HygienePlan): {value: unknown; failed: boolean; findings: readonly Finding[]} {
  switch (id) {
    case "format": {
      const parsed = formatPayloadSchema.parse(value);
      return {value: parsed, failed: parsed.unformattedCount > 0, findings: []};
    }
    case "lint": {
      const parsed = lintPayloadSchema.parse(value);
      return {value: parsed, failed: parsed.errorCount > 0, findings: []};
    }
    case "stats":
      return {value: statsPayloadSchema.parse(value), failed: false, findings: []};
    case "test-typescript":
    case "test-dotnet":
    case "test-python": {
      const parsed = testSuitesPayloadSchema.parse(value);
      const names = parsed.suites.map((suite) => suite.name);
      if (names.length === 0 || new Set(names).size !== names.length) throw new TypeError("Missing or duplicate completed test suites");
      if (id === "test-typescript" && (names.length !== plan.suites.length || plan.suites.some((name) => !names.includes(name))))
        throw new TypeError("Completed evidence does not cover the planned TypeScript suites");
      const findings = flattenSuiteFindings(parsed.suites);
      return {
        value: parsed,
        failed: parsed.failed > 0 || evaluateGate(providerDescriptor(id).defaultGate, findings) === "failed",
        findings,
      };
    }
  }
}

/**
 * Decodes identity, payload, findings, and plan-owned gate policy.
 * @param value - Untrusted parsed provider JSON.
 * @param plan - Validated shared plan declaring all required identities.
 * @returns A compatible version-1 record with reconciled suite findings; legitimate skips bypass payload parsing.
 * @throws TypeError for unsupported, incompatible, contradictory, or malformed evidence.
 */
export function decodeProviderOutcome(value: unknown, plan: HygienePlan): VersionedProviderOutcome<unknown> {
  const raw = record(value, "provider outcome");
  if (raw["schemaVersion"] !== "1") throw new TypeError("Unsupported provider outcome version");
  const id = decodeProviderId(raw["providerId"]);
  const descriptor = providerDescriptor(id);
  const expected = plan.providers.find((provider) => provider.id === id);
  if (!expected?.requiredOutcome) throw new TypeError("Outcome provider is not required by the plan");
  if (raw["commitSha"] !== plan.commitSha || raw["workflowRunId"] !== plan.workflowRunId || raw["planId"] !== plan.id)
    throw new TypeError("Outcome commit/run/plan identity mismatch");
  if (raw["providerName"] !== descriptor.name || raw["providerIcon"] !== descriptor.icon)
    throw new TypeError("Outcome provider metadata does not match the registry");
  const gate = record(raw["gate"], "outcome gate");
  if (
    gate["kind"] !== descriptor.defaultGate.kind
    || (descriptor.defaultGate.kind === "blocking" && gate["blockOn"] !== descriptor.defaultGate.blockOn)
  )
    throw new TypeError("Outcome cannot redefine plan-owned gate policy");
  const workflowRunAttempt = count(raw["workflowRunAttempt"], "workflowRunAttempt");
  if (workflowRunAttempt < 1) throw new TypeError("Invalid originating workflow attempt");
  const executionStatus = execution(raw["executionStatus"]);
  const evidenceStatus = completeness(raw["evidenceStatus"]);
  const findings = array(raw["findings"], "outcome findings").map(decodeFinding);
  const error = providerError(raw["error"]);
  let decodedPayload: unknown = null;
  let skipReason: string | undefined;
  if (executionStatus === "skipped") {
    if (expected.selected || raw["payload"] !== null || findings.length > 0 || error !== null || evidenceStatus !== "complete")
      throw new TypeError("Invalid planned-skip evidence");
    skipReason = text(raw["skipReason"], "skip reason");
    if (!skipReason.trim()) throw new TypeError("Missing planned-skip reason");
  } else {
    if (!expected.selected && executionStatus !== "errored" && executionStatus !== "cancelled")
      throw new TypeError("Unselected provider unexpectedly executed");
    const completed = executionStatus === "passed" || executionStatus === "failed";
    if (completed && error !== null) throw new TypeError("Completed outcome contains an execution error");
    if (raw["payload"] !== null) {
      const parsed = payload(id, raw["payload"], plan);
      decodedPayload = parsed.value;
      if (executionStatus === "passed" && parsed.failed) throw new TypeError("Passing metadata conceals a failed payload");
      const known = new Set(findings.map((finding) => JSON.stringify(finding)));
      for (const finding of parsed.findings) {
        const key = JSON.stringify(finding);
        if (!known.has(key)) {
          findings.push(finding);
          known.add(key);
        }
      }
    } else if (completed) throw new TypeError("Completed provider payload is missing");
  }
  const gateResult =
    executionStatus === "errored" || executionStatus === "cancelled" || evidenceStatus !== "complete"
      ? "errored"
      : executionStatus === "failed" && descriptor.defaultGate.kind === "blocking"
        ? "failed"
        : evaluateGate(descriptor.defaultGate, findings);
  if (raw["gateResult"] !== gateResult) throw new TypeError("Outcome gate result contradicts validated evidence");
  return {
    schemaVersion: "1",
    providerId: id,
    providerName: descriptor.name,
    providerIcon: descriptor.icon,
    gate: descriptor.defaultGate,
    gateResult,
    durationMs: finite(raw["durationMs"], "outcome durationMs"),
    startedAt: timestamp(raw["startedAt"], "outcome startedAt"),
    finishedAt: timestamp(raw["finishedAt"], "outcome finishedAt"),
    payload: decodedPayload,
    findings,
    error,
    commitSha: plan.commitSha,
    workflowRunId: plan.workflowRunId,
    workflowRunAttempt,
    planId: plan.id,
    executionStatus,
    evidenceStatus,
    ...(skipReason === undefined ? {} : {skipReason}),
  };
}

function diagnostic(error: unknown): string {
  return error instanceof SyntaxError
    ? "Outcome evidence is not valid JSON"
    : error instanceof Error
      ? error.message
      : "Outcome evidence could not be read or validated";
}

/**
 * Discovers nested artifacts without flattening away provenance or conflicts.
 * @param root - Downloaded evidence root, not the workspace root.
 * @param plan - Required provider/commit/run/plan identities.
 * @param currentAttempt - Positive current run attempt.
 * @returns Newest compatible unique records plus all invalid/missing/future diagnostics.
 */
export async function loadProviderOutcomes(root: string, plan: HygienePlan, currentAttempt: number): Promise<LoadedOutcomes> {
  if (!Number.isSafeInteger(currentAttempt) || currentAttempt < 1) throw new RangeError("Invalid current workflow attempt");
  const issues: EvidenceIssue[] = [];
  const grouped = new Map<string, Map<number, Candidate[]>>();
  let paths: readonly string[] = [];
  try {
    if (await fs.exists(root)) paths = await fs.find(root, /^outcome-.+\.json$/);
  } catch (error) {
    issues.push({code: "evidence-discovery-failed", message: diagnostic(error), sourcePath: root});
  }
  for (const sourcePath of paths.toSorted()) {
    let decoded: VersionedProviderOutcome<unknown>;
    try {
      decoded = await fs.readValidatedJson(sourcePath, (value) => decodeProviderOutcome(value, plan), MAX_REPORT_BYTES);
    } catch (error) {
      issues.push({code: "invalid-outcome", message: diagnostic(error), sourcePath});
      continue;
    }
    if (decoded.workflowRunAttempt > currentAttempt) {
      issues.push({
        code: "future-attempt",
        message: "Outcome originates from a future workflow attempt",
        providerId: decoded.providerId,
        sourcePath,
      });
      continue;
    }
    const attempts = grouped.get(decoded.providerId) ?? new Map<number, Candidate[]>();
    const records = attempts.get(decoded.workflowRunAttempt) ?? [];
    records.push({outcome: decoded, sourcePath});
    attempts.set(decoded.workflowRunAttempt, records);
    grouped.set(decoded.providerId, attempts);
  }
  const outcomes: VersionedProviderOutcome<unknown>[] = [];
  for (const provider of plan.providers) {
    const attempts = grouped.get(provider.id);
    const candidates: VersionedProviderOutcome<unknown>[] = [];
    for (const [attempt, records] of attempts ?? []) {
      if (records.length > 1)
        records.forEach((record) =>
          issues.push({
            code: "duplicate-outcome",
            message: `Duplicate records for originating attempt ${attempt}`,
            providerId: provider.id,
            sourcePath: record.sourcePath,
          }),
        );
      else if (records[0]) candidates.push(records[0].outcome);
    }
    const selected = candidates.sort((a, b) => b.workflowRunAttempt - a.workflowRunAttempt)[0];
    if (selected) outcomes.push(selected);
    else issues.push({code: "missing-outcome", message: "Required provider outcome is missing or unusable", providerId: provider.id});
  }
  return {outcomes, issues};
}
