/**
 * @fileoverview Plan-owned provider execution and validated versioned evidence.
 * @module github/scripts/lib/hygiene/runner
 */
import type {Clock, WorkflowContext} from "../context.ts";
import type {HygienePlan} from "../planning/types.ts";
import {
  decodeFinding,
  evaluateGate,
  type CheckProvider,
  type EvidenceStatus,
  type ExecutionStatus,
  type ProviderError,
  type ProviderRunInput,
  type VersionedProviderOutcome,
} from "./contracts.ts";
import {decodeProviderOutcome} from "./outcomes.ts";
import {decodeProviderId, providerDescriptor} from "./registry.ts";
import {CommandExecutionError} from "../../helpers/exec/index.ts";
import {redactEvidenceText} from "../../helpers/reports/redact.ts";
import {PROVIDER_ERROR_MESSAGE_LIMIT} from "./contracts.ts";

function errorData(error: unknown): ProviderError {
  if (!(error instanceof Error)) return {message: "Provider threw a non-Error value"};
  const sanitize = (value: string): string => redactEvidenceText(value).replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, "");
  let message = sanitize(error.message || error.name);
  if (error instanceof CommandExecutionError) {
    const stderr = sanitize(error.stderr).trim();
    const errorLines = stderr.split(/\r?\n/).filter((line) => /\b(?:error|exception|failed|fatal)\b/i.test(line));
    const diagnostic = errorLines.length > 0 ? errorLines.join("\n") : stderr;
    if (diagnostic) message += `\n${diagnostic}`;
  }
  return {
    message: message.slice(0, PROVIDER_ERROR_MESSAGE_LIMIT),
    ...(error.stack ? {stack: sanitize(error.stack).slice(0, PROVIDER_ERROR_MESSAGE_LIMIT)} : {}),
  };
}

/**
 * Executes only plan-selected work, with no artifact writes or action-status side effects.
 * @param provider - Executable implementation of a registered provider.
 * @param input - Resource inputs; plan-owned scope and suites supersede local heuristics.
 * @param context - Validated current run/commit/attempt identity.
 * @param plan - Immutable shared selection and required identities.
 * @param clock - Wall timestamps and independent monotonic duration source.
 * @returns Validated versioned evidence, including explicit skip/error states.
 * @throws For unknown identities, incompatible context, or an invalid clock contract.
 */
export async function executeProvider(
  provider: CheckProvider<unknown>,
  input: ProviderRunInput,
  context: WorkflowContext,
  plan: HygienePlan,
  clock: Clock,
): Promise<VersionedProviderOutcome<unknown>> {
  const id = decodeProviderId(provider.id);
  const descriptor = providerDescriptor(id);
  const planned = plan.providers.find((value) => value.id === id);
  if (!planned || context.commitSha.toLowerCase() !== plan.commitSha || context.workflowRunId !== plan.workflowRunId)
    throw new TypeError("Provider context does not belong to the plan");
  const startedAt = clock.now().toISOString();
  const start = clock.monotonicMs();
  let executionStatus: ExecutionStatus = planned.selected ? "passed" : "skipped";
  let evidenceStatus: EvidenceStatus = planned.selected ? "missing" : "complete";
  let payload: unknown = null;
  let findings: VersionedProviderOutcome<unknown>["findings"] = [];
  let error: ProviderError | null = null;
  if (planned.selected) {
    try {
      const result = await provider.run({
        ...input,
        changeScope: plan.mode === "full" ? "unknown" : "known",
        changedFiles: plan.changes.scope === "known" ? plan.changes.entries.map((entry) => entry.path) : [],
        baseRef: plan.changes.scope === "known" ? plan.changes.baseSha : input.baseRef,
        headRef: plan.commitSha,
        selectedSuites: plan.suites,
      });
      evidenceStatus = "invalid";
      payload = provider.payloadSchema.parse(result.payload);
      findings = result.findings.map(decodeFinding);
      if (result.executionStatus !== undefined && !["passed", "failed", "errored"].includes(result.executionStatus))
        throw new TypeError("Invalid provider execution status");
      executionStatus = result.executionStatus ?? (evaluateGate(descriptor.defaultGate, findings) === "failed" ? "failed" : "passed");
      evidenceStatus = result.evidenceStatus ?? "complete";
      if (executionStatus === "errored")
        error = {
          message:
            findings.find((finding) => finding.severity === "error" || finding.severity === "critical")?.message
            ?? "Provider reported an operational failure",
        };
    } catch (failure) {
      executionStatus = "errored";
      error = errorData(failure);
      payload = null;
      findings = [];
    }
  }
  const durationMs = clock.monotonicMs() - start;
  if (!Number.isFinite(durationMs) || durationMs < 0) throw new RangeError("Invalid monotonic provider duration");
  const candidate: VersionedProviderOutcome<unknown> = {
    schemaVersion: "1",
    providerId: id,
    providerName: descriptor.name,
    providerIcon: descriptor.icon,
    gate: descriptor.defaultGate,
    gateResult:
      executionStatus === "errored" || evidenceStatus !== "complete"
        ? "errored"
        : executionStatus === "failed" && descriptor.defaultGate.kind === "blocking"
          ? "failed"
          : evaluateGate(descriptor.defaultGate, findings),
    durationMs,
    startedAt,
    finishedAt: clock.now().toISOString(),
    payload,
    findings,
    error,
    commitSha: plan.commitSha,
    workflowRunId: plan.workflowRunId,
    workflowRunAttempt: context.workflowRunAttempt,
    planId: plan.id,
    executionStatus,
    evidenceStatus,
    ...(planned.selected ? {} : {skipReason: planned.reason}),
  };
  try {
    return decodeProviderOutcome(candidate, plan);
  } catch (failure) {
    return decodeProviderOutcome(
      {
        ...candidate,
        executionStatus: "errored",
        evidenceStatus: "invalid",
        gateResult: "errored",
        error: errorData(failure),
        payload: null,
        findings: [],
      },
      plan,
    );
  }
}
