/**
 * @fileoverview The detect job's single validated hygiene-plan producer.
 * @module github/scripts/src/hygiene/pipeline/preparePlan
 */
import {join} from "node:path";
import * as core from "../../../helpers/sdk/core.ts";
import {createEnvironmentHelper} from "../../../helpers/environment/index.ts";
import {createGitHelper} from "../../../helpers/git/index.ts";
import {fs} from "../../../helpers/filesystem/index.ts";
import {runWorkspaceInspection} from "../../../helpers/workspace/index.ts";
import {MAX_REPORT_BYTES} from "../../../helpers/reports/validation.ts";
import {captureWorkflowContext, type WorkflowContext} from "../../../lib/context.ts";
import {buildHygienePlan, toProviderMatrix} from "../../../lib/planning/plan.ts";
import {decodeSharedInputs, decodeWorkspaceInspection} from "../../../lib/planning/workspace.ts";
import type {HygienePlan, WorkspaceInspection} from "../../../lib/planning/types.ts";
import {summarizePlanSelection} from "../../../lib/planning/presentation.ts";

/**
 * Collects immutable Git/Nx evidence and persists exactly one shared plan.
 * @param context - Actual checkout and explicit run identity.
 * @param mode - Requested affected/full scope.
 * @returns The persisted plan, with broad fallback diagnostics when observation fails.
 * @throws Persistence/programmer errors rather than emitting a fake empty plan.
 */
export async function preparePlanCore(context: WorkflowContext, mode: "affected" | "full"): Promise<HygienePlan> {
  const changes = await createGitHelper({cwd: context.workspaceRoot}).getChangeSet(context.workspaceRoot, context.baseRef, context.headRef);
  let workspace: WorkspaceInspection = {
    kind: "unavailable",
    reason: "Workspace inspection not required for a known-empty diff",
    durationMs: 0,
  };
  let sharedInputs: readonly string[] = [];
  if (mode === "full" || changes.scope === "unknown" || changes.entries.length > 0) {
    const result = await runWorkspaceInspection(context.workspaceRoot);
    if (result.exitCode !== 0)
      workspace = {kind: "unavailable", reason: `Workspace facts worker exited with code ${result.exitCode}`, durationMs: 0};
    else {
      try {
        const value: unknown = JSON.parse(result.stdout);
        workspace = decodeWorkspaceInspection(value);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Invalid workspace facts";
        if (!(error instanceof SyntaxError) && !(error instanceof TypeError)) throw error;
        workspace = {
          kind: "invalid",
          issues: [error instanceof SyntaxError ? "Workspace facts worker emitted invalid JSON" : message],
          durationMs: 0,
        };
      }
    }
    try {
      sharedInputs = await fs.readValidatedJson(join(context.workspaceRoot, "nx.json"), decodeSharedInputs, MAX_REPORT_BYTES);
    } catch (error) {
      workspace = {
        kind: "invalid",
        issues: [`Cannot validate declared Nx shared inputs: ${error instanceof Error ? error.message : "unknown error"}`],
        durationMs: 0,
      };
    }
  }
  const plan = buildHygienePlan({context, mode, changes, workspace, sharedInputs});
  await fs.writeJsonAtomic(join(context.workspaceRoot, "artifacts", "hygiene", "plan.json"), plan);
  return plan;
}

/** Resolves the explicit manual scope, persists the plan, and emits only its small matrix/ID. */
export async function main(argv: readonly string[] = process.argv.slice(2)): Promise<void> {
  try {
    if (argv.length !== 2 || argv[0] !== "--scope" || (argv[1] !== "affected" && argv[1] !== "full"))
      throw new TypeError("Usage: preparePlan.ts --scope affected|full");
    const context = await captureWorkflowContext(createEnvironmentHelper().snapshot(), {mode: "actions"});
    const plan = await preparePlanCore(context, argv[1]);
    core.setOutput("provider-matrix", JSON.stringify(toProviderMatrix(plan)));
    core.setOutput("plan-id", plan.id);
    core.info(`Hygiene plan ${plan.id}: ${plan.mode}; ${plan.providers.filter((provider) => provider.selected).length} selected providers`);
    const selection = summarizePlanSelection(plan);
    if (selection.level === "warning") core.warning(selection.message);
    else core.info(selection.message);
    if (core.isDebug()) for (const diagnostic of plan.diagnostics) core.debug(`${diagnostic.code}: ${diagnostic.message}`);
  } catch (error) {
    core.setFailed(error instanceof Error ? error.message : "Could not prepare hygiene plan");
    process.exitCode = 1;
  }
}

if (import.meta.main) {
  void main();
}
