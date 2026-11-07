/**
 * @fileoverview Compatible imported unit-report entrypoint; imports have no execution effects.
 * @module github/scripts/src/runUnitTestAction
 */
import * as core from "../helpers/sdk/core.ts";
import * as github from "../helpers/sdk/github.ts";
import {createEnvironmentHelper} from "../helpers/environment/index.ts";
import {createGitHelper} from "../helpers/git/index.ts";
import {createGitHubHelper} from "../helpers/github/index.ts";
import {fs} from "../helpers/filesystem/index.ts";
import {playwright} from "../helpers/playwright/index.ts";
import {vitest} from "../helpers/vitest/index.ts";
import {captureWorkflowContext} from "../lib/context.ts";
import {jobStatus} from "../lib/live-tests/results.ts";
import {runUnitTestReport} from "../lib/unit-tests/report.ts";

/**
 * Composes and optionally publishes the existing test-results comment.
 * @returns Completion after every publication result is surfaced.
 * @throws Invalid Actions configuration after explicit action-status mapping.
 */
export default async function runUnitTestAction(): Promise<void> {
  try {
    const variables = createEnvironmentHelper().snapshot();
    const repository = variables["GITHUB_REPOSITORY"] ?? `${github.context.repo.owner}/${github.context.repo.repo}`;
    const pr: unknown = github.context.payload.pull_request?.number;
    const context = await captureWorkflowContext(
      {
        ...variables,
        GITHUB_REPOSITORY: repository,
        ...(variables["PR_NUMBER"] === undefined && typeof pr === "number" ? {PR_NUMBER: String(pr)} : {}),
      },
      {mode: "actions"},
    );
    const git = createGitHelper({cwd: context.workspaceRoot});
    const token = createEnvironmentHelper(variables).get("GITHUB_TOKEN");
    const results = await runUnitTestReport(context, {
      git,
      files: fs,
      vitest,
      playwright,
      github: token ? createGitHubHelper(token) : null,
      jobStatus: jobStatus(variables["JOB_STATUS"]),
      paths: {
        coverage: "sites/arolariu.ro/code-cov/vitest/coverage-summary.json",
        playwright: "sites/arolariu.ro/code-cov/playwright-report/results.json",
      },
    });
    for (const result of results) {
      if (result.status === "failed") core.warning(`Unit test comment publication failed: ${result.message}`);
      else if (result.status === "skipped") core.notice(result.reason);
      else core.info("✓ Successfully published the unit test summary comment");
    }
  } catch (error) {
    core.setFailed(`Unit test reporting configuration failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    throw error;
  }
}
