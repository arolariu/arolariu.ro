/**
 * @fileoverview Required-plan provider launcher; lib owns execution/evidence policy.
 * @module github/scripts/src/hygiene/pipeline/runProvider
 */
import {join} from "node:path";
import * as core from "../../../helpers/sdk/core.ts";
import {fs} from "../../../helpers/filesystem/index.ts";
import {createEnvironmentHelper} from "../../../helpers/environment/index.ts";
import {captureWorkflowContext, systemClock, type Clock, type WorkflowContext} from "../../../lib/context.ts";
import type {HygienePlan} from "../../../lib/planning/types.ts";
import {loadRequiredPlan} from "../../../lib/planning/transport.ts";
import {executeProvider} from "../../../lib/hygiene/runner.ts";
import type {CheckProvider} from "../../../lib/hygiene/contracts.ts";
import {REGISTRY} from "../providers/registry.ts";

/** Explicit application inputs; the immutable plan is mandatory. */
export interface RunProviderDeps {
  readonly registry: readonly CheckProvider<unknown>[];
  readonly context: WorkflowContext;
  readonly plan: HygienePlan;
  readonly env: NodeJS.ProcessEnv;
  readonly clock?: Clock;
}

/**
 * Delegates execution, awaits atomic evidence persistence, and returns gate status.
 * @param providerId - Existing stable provider identity.
 * @param deps - Registered implementations, actual context, required plan, and execution inputs.
 * @returns Zero for passing/advisory/skipped work, one for failed/errored/unknown providers.
 */
export async function runProviderCore(providerId: string, deps: RunProviderDeps): Promise<number> {
  const provider = deps.registry.find((provider) => provider.id === providerId);
  if (!provider) {
    core.error(`Unknown provider id: ${providerId}`);
    return 1;
  }
  const outcome = await executeProvider(
    provider,
    {
      workspaceRoot: deps.context.workspaceRoot,
      baseRef: deps.context.baseRef,
      headRef: deps.context.headRef,
      changeScope: deps.plan.changes.scope,
      changedFiles: [],
      env: deps.env,
    },
    deps.context,
    deps.plan,
    deps.clock ?? systemClock,
  );
  await fs.writeJsonAtomic(join(deps.context.workspaceRoot, "artifacts", "hygiene", `outcome-${provider.id}.json`), outcome);
  core.notice(
    `${provider.icon} ${provider.name}: ${outcome.executionStatus} / ${outcome.gateResult} (${outcome.findings.length} finding(s))`,
  );
  return outcome.gateResult === "failed" || outcome.gateResult === "errored" ? 1 : 0;
}

/** CLI usage: runProvider.ts <existing-provider-id> --plan <path>. */
export async function main(argv: readonly string[] = process.argv.slice(2)): Promise<void> {
  try {
    const id = argv[0];
    if (!id) throw new TypeError("Usage: runProvider.ts <provider-id> --plan <path>");
    const plan = await loadRequiredPlan(argv.slice(1));
    const env = createEnvironmentHelper().snapshot();
    const context = await captureWorkflowContext(env, {mode: "actions"});
    process.exitCode = await runProviderCore(id, {registry: REGISTRY, context, plan, env});
  } catch (error) {
    core.setFailed(error instanceof Error ? error.message : "Provider execution failed");
    process.exitCode = 1;
  }
}

if (import.meta.main) {
  void main();
}
