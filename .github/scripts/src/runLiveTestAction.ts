/**
 * @fileoverview Compatible imported live-test entrypoint over explicit lib services.
 * @module github/scripts/src/runLiveTestAction
 * @remarks Importing this module never executes the workflow or publishes an issue.
 */
import * as core from "../helpers/sdk/core.ts";
import * as github from "../helpers/sdk/github.ts";
import {createEnvironmentHelper} from "../helpers/environment/index.ts";
import {createGitHubHelper} from "../helpers/github/index.ts";
import type {NewmanExecutionStats} from "../helpers/newman/index.ts";
import {captureWorkflowContext} from "../lib/context.ts";
import {DEFAULT_TARGETS, readLiveConfiguration} from "../lib/live-tests/config.ts";
import {collectLiveEvidence, loadNewmanReports as loadReports, type TestArtifactPaths} from "../lib/live-tests/evidence.ts";
import {readTargetStatuses, reduceLiveResults, type E2ETestResults} from "../lib/live-tests/results.ts";
import {renderLiveIssue} from "../lib/live-tests/render.ts";
import {publishLiveFailure} from "../lib/live-tests/publish.ts";

export {discoverTestArtifacts, extractTargetFromReportPath} from "../lib/live-tests/evidence.ts";
export type {BackendHealthCheck, TestArtifactPaths} from "../lib/live-tests/evidence.ts";
export type {JobStatus, TargetTestResult, E2ETestResults, WorkflowMetadata} from "../lib/live-tests/results.ts";

/**
 * Preserves the legacy default-target convenience with an explicit invalid-input warning.
 * @returns Requested supported targets or the existing three defaults.
 */
export function parseTargetsFromEnvironment(): readonly string[] {
  const targets = createEnvironmentHelper().get("TARGETS");
  try {
    return readLiveConfiguration(targets === undefined ? {} : {TARGETS: targets}).targets;
  } catch {
    core.warning("Invalid live target configuration; using the default targets");
    return DEFAULT_TARGETS;
  }
}

/**
 * Captures the current target metadata through the environment broker.
 * @param targets - Requested target identities.
 * @returns Parsed execution states; unknown values never become success.
 */
export function extractTestResults(targets: readonly string[]): E2ETestResults {
  return readTargetStatuses(targets, createEnvironmentHelper().snapshot());
}

/**
 * Compatible partial loader; invalid files are warned rather than silently skipped.
 * @param artifacts - An already discovered index.
 * @returns All valid Newman statistics.
 */
export function loadNewmanReports(artifacts: TestArtifactPaths): Promise<Readonly<Record<string, NewmanExecutionStats>>> {
  return loadReports(artifacts, (issue) => core.warning(`${issue.code}: ${issue.message}`));
}

/**
 * Runs the existing scheduled live-report action only when explicitly called.
 * @returns Completion after required incident publication or an explicit no-incident skip.
 * @throws Original publication/configuration failure after mapping action status.
 */
export default async function runLiveTestAction(): Promise<void> {
  try {
    const variables = createEnvironmentHelper().snapshot();
    const repository = variables["GITHUB_REPOSITORY"] ?? `${github.context.repo.owner}/${github.context.repo.repo}`;
    const context = await captureWorkflowContext({...variables, GITHUB_REPOSITORY: repository}, {mode: "actions"});
    const configuration = readLiveConfiguration(variables);
    const evidence = await collectLiveEvidence(configuration);
    const report = reduceLiveResults(configuration.targets, evidence);
    for (const issue of report.diagnostics) core.warning(`${issue.code}${issue.target ? ` (${issue.target})` : ""}: ${issue.message}`);
    if (!report.hasFailures) {
      core.notice("✓ No test failures detected. Skipping issue creation.");
      return;
    }
    const token = createEnvironmentHelper(variables).getRequired("GITHUB_TOKEN");
    const result = await publishLiveFailure(context, report, renderLiveIssue(context, report, configuration), createGitHubHelper(token));
    if (result.status === "failed") throw result.error;
    if (result.status === "skipped") core.warning(`⏭️ ${result.reason}. Skipping duplicate creation.`);
    else core.notice(`Created E2E test failure issue: ${result.url ?? ""}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown live reporting failure";
    core.error(`❌ E2E failure issue creation failed: ${message}`);
    core.setFailed(`Failed to create E2E test failure issue: ${message}`);
    throw error;
  }
}
