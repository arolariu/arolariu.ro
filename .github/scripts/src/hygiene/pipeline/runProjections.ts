/**
 * @fileoverview Required-plan verified gate; independent projections cannot hide missing evidence.
 * @module github/scripts/src/hygiene/pipeline/runProjections
 */
import {join} from "node:path";
import * as core from "../../../helpers/sdk/core.ts";
import {createEnvironmentHelper} from "../../../helpers/environment/index.ts";
import {createGitHubHelper} from "../../../helpers/github/index.ts";
import {captureWorkflowContext} from "../../../lib/context.ts";
import {loadRequiredPlan} from "../../../lib/planning/transport.ts";
import {buildVerifiedReport} from "../../../lib/hygiene/aggregate.ts";
import {loadProviderOutcomes} from "../../../lib/hygiene/outcomes.ts";
import type {HygieneReport} from "../../../lib/hygiene/contracts.ts";
import {publicationExitCode, publishAll, type Projection as SharedProjection} from "../../../lib/reporting/projections.ts";
import {writeJsonArtifact} from "../projections/jsonArtifact.ts";
import {writeStepSummary} from "../projections/stepSummary.ts";
import {postPrComment} from "../projections/prComment.ts";
import {postStatusChecks} from "../projections/statusChecks.ts";

/** Compatible name, now requiring the same explicit shared publication contract. */
export type Projection = SharedProjection<HygieneReport>;
export {loadProviderOutcomes as loadOutcomes} from "../../../lib/hygiene/outcomes.ts";

/**
 * Publishes every independent projection before selecting the final exit code.
 * @param report - Verified report retaining all evidence issues.
 * @param projections - Explicit required/optional publication contracts.
 * @returns The primary gate result plus required-publication truth.
 */
export async function runProjectionsCore(report: HygieneReport, projections: readonly Projection[]): Promise<number> {
  const results = await publishAll(report, projections);
  for (const result of results) {
    if (result.status === "failed") core.warning(`Projection '${result.name}' failed: ${result.message}`);
    else core.info(`Projection '${result.name}': ${result.status}`);
  }
  return publicationExitCode(report, results);
}

/** CLI usage: runProjections.ts --plan <path>; missing or incompatible plans fail. */
export async function main(argv: readonly string[] = process.argv.slice(2)): Promise<void> {
  try {
    const plan = await loadRequiredPlan(argv);
    const variables = createEnvironmentHelper().snapshot();
    const context = await captureWorkflowContext(variables, {mode: "actions"});
    const loaded = await loadProviderOutcomes(join(context.workspaceRoot, "artifacts", "hygiene"), plan, context.workflowRunAttempt);
    const report = buildVerifiedReport(context, plan, loaded);
    const token = createEnvironmentHelper(variables).get("GITHUB_TOKEN");
    const github = token ? createGitHubHelper(token) : null;
    const projections: readonly Projection[] = [
      {
        name: "jsonArtifact",
        required: true,
        run: async (value) => {
          await writeJsonArtifact(value, context.workspaceRoot);
          return {status: "published"};
        },
      },
      {
        name: "stepSummary",
        required: false,
        run: async (value) => {
          if (!variables["GITHUB_STEP_SUMMARY"]) return {status: "skipped", reason: "No Actions step-summary path"};
          await writeStepSummary(value);
          return {status: "published"};
        },
      },
      {
        name: "prComment",
        required: false,
        run: async (value) => {
          if (!github || value.prNumber === null) return {status: "skipped", reason: "No token or PR context"};
          await postPrComment(value, github);
          return {status: "published"};
        },
      },
      {
        name: "statusChecks",
        required: false,
        run: async (value) => {
          if (!github) return {status: "skipped", reason: "No token for check publication"};
          await postStatusChecks(value, {
            owner: context.repoOwner,
            repo: context.repoName,
            create: (args) => github.getClient().rest.checks.create({...args}),
          });
          return {status: "published"};
        },
      },
    ];
    const code = await runProjectionsCore(report, projections);
    if (code !== 0)
      core.setFailed(`Hygiene verification failed: ${report.overallResult}; ${report.evidenceIssues?.length ?? 0} evidence issue(s)`);
    process.exitCode = code;
  } catch (error) {
    core.setFailed(error instanceof Error ? error.message : "Hygiene gate failed");
    process.exitCode = 1;
  }
}

if (import.meta.main) {
  void main();
}
