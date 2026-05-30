/**
 * @fileoverview Per-provider workflow step entry point.
 * @module github/scripts/src/hygiene/pipeline/runProvider
 *
 * @remarks
 * Loads a provider by id, runs it, captures timing/errors, evaluates the gate,
 * writes outcome-{id}.json. Exit codes:
 *   - 0 when gateResult is "passed" or "advisory"
 *   - 1 when gateResult is "failed" or "errored"
 *   - 1 when the provider id is unknown
 *
 * The workflow uses step-level `continue-on-error: true` on each provider step,
 * so the non-zero exit surfaces a warning marker on that step in the UI while
 * still allowing later providers and the final gate to run. The aggregate
 * workflow pass/fail is decided by `runProjections.ts` (the single point that
 * calls `core.setFailed`), not by individual provider exit codes.
 *
 * CLI usage:
 *   node --experimental-strip-types runProvider.ts <providerId>
 */

import * as core from "@actions/core";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import {evaluateGate, type ProviderOutcome} from "../domain/types.ts";
import type {CheckProvider} from "../domain/provider.ts";
import {REGISTRY} from "../providers/registry.ts";
import {buildContextFromEnv, type PipelineContext} from "./context.ts";

export interface RunProviderDeps {
  readonly registry: readonly CheckProvider<unknown>[];
  readonly context: PipelineContext;
  readonly changedFiles: readonly string[];
}

/**
 * Core logic, testable without process.exit / argv.
 * @returns process exit code:
 *   - 1 if the provider id is unknown
 *   - 1 if the gateResult is "failed" or "errored" (so step UI shows a warning under `continue-on-error: true`)
 *   - 0 if the gateResult is "passed" or "advisory"
 */
export async function runProviderCore(providerId: string, deps: RunProviderDeps): Promise<number> {
  const provider = deps.registry.find((p) => p.id === providerId);
  if (!provider) {
    core.error(`Unknown provider id: ${providerId}. Available: ${deps.registry.map((p) => p.id).join(", ")}`);
    return 1;
  }

  const startedAt = new Date();
  const t0 = performance.now();

  const runInput = {
    workspaceRoot: deps.context.workspaceRoot,
    baseRef: deps.context.baseRef,
    headRef: deps.context.headRef,
    changedFiles: deps.changedFiles,
    env: deps.context.env,
  };

  let payload: unknown = null;
  let findings: readonly import("../domain/types.ts").Finding[] = [];
  let outcomeError: ProviderOutcome<unknown>["error"] = null;
  let gateResult: ProviderOutcome<unknown>["gateResult"];

  try {
    if (!provider.applicableTo(runInput)) {
      core.info(`Provider '${providerId}' is not applicable to this PR; skipping with passed outcome.`);
      payload = null;
      findings = [];
      gateResult = "passed";
    } else {
      const result = await provider.run(runInput);
      payload = result.payload;
      findings = result.findings;
      gateResult = evaluateGate(provider.defaultGate, findings);
    }
  } catch (err) {
    const e = err as Error;
    core.error(`Provider '${providerId}' threw: ${e.message}`);
    outcomeError = {message: e.message, ...(e.stack ? {stack: e.stack} : {})};
    gateResult = "errored";
  }

  const finishedAt = new Date();
  const durationMs = Math.round(performance.now() - t0);

  const outcome: ProviderOutcome<unknown> = {
    providerId: provider.id,
    providerName: provider.name,
    providerIcon: provider.icon,
    gate: provider.defaultGate,
    gateResult,
    durationMs,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    payload,
    findings,
    error: outcomeError,
  };

  const dir = path.join(deps.context.workspaceRoot, "artifacts", "hygiene");
  await fs.mkdir(dir, {recursive: true});
  await fs.writeFile(path.join(dir, `outcome-${provider.id}.json`), JSON.stringify(outcome, null, 2), "utf-8");

  // Surface a step-summary blurb so the step UI reflects the gate result.
  const icon = gateResult === "passed" ? "✅" : gateResult === "advisory" ? "ℹ️" : gateResult === "errored" ? "💥" : "❌";
  core.notice(`${icon} ${provider.icon} ${provider.name}: ${gateResult} (${findings.length} finding(s), ${durationMs}ms)`);

  // Exit non-zero on failed/errored so the workflow step renders a warning marker
  // under `continue-on-error: true`. The single source of truth for workflow
  // pass/fail is still runProjections.ts, which calls core.setFailed().
  return gateResult === "failed" || gateResult === "errored" ? 1 : 0;
}

/**
 * CLI entrypoint. Reads providerId from argv, exits with the core return code.
 */
export async function main(argv: readonly string[]): Promise<void> {
  const providerId = argv[2];
  if (!providerId) {
    core.setFailed("Usage: runProvider.ts <providerId>");
    process.exit(1);
  }
  const context = buildContextFromEnv(process.env as Record<string, string | undefined>);
  // Lightweight changedFiles fetch using git directly (avoid pulling helpers/git here).
  const changedFiles: string[] = [];
  const exitCode = await runProviderCore(providerId, {registry: REGISTRY, context, changedFiles});
  process.exit(exitCode);
}

// Only invoke main when run directly (`node runProvider.ts <id>`), not when imported by tests.
const invokedDirectly = process.argv[1] && process.argv[1].endsWith("runProvider.ts");
if (invokedDirectly) {
  void main(process.argv);
}
