/**
 * @fileoverview Unified code hygiene check orchestrator for GitHub Actions
 * @module src/runHygieneCheck
 *
 * This module serves as the entry point for hygiene check operations in GitHub Actions.
 * It delegates to specialized check modules and handles artifact-based data flow.
 *
 * **Architecture (v2):**
 * - Each check (format, lint, test, stats) runs in its own workflow job
 * - Each check produces a `{check}-result.json` artifact
 * - The summary job downloads all artifacts and builds a rich PR comment
 *
 * **Modes:**
 * - `detect`: Change detection only (unchanged from v1)
 * - `format`: Run format check via formatCheck module
 * - `lint`: Run lint check via lintCheck module
 * - `test`: Run test check via testCheck module
 * - `stats`: Run stats check via statsCheck module
 * - `summary`: Download all artifacts and post PR comment
 *
 * @example
 * ```yaml
 * # In GitHub Actions workflow
 * - uses: actions/github-script@v8
 *   env:
 *     CHECK_MODE: "format"
 *   with:
 *     script: |
 *       const { default: runHygieneCheck } = await import('./runHygieneCheck.ts');
 *       await runHygieneCheck();
 * ```
 */

import * as core from "@actions/core";
import * as fs from "node:fs/promises";
import * as path from "node:path";

import {createGitHubHelper, env, git} from "../helpers/index.ts";

import {
  type HygieneCheckResult,
  type HygieneReport,
  buildHygieneComment,
  createHygieneReport,
  HYGIENE_COMMENT_IDENTIFIER,
  runFormatCheck,
  runLintCheck,
  runStatsCheck,
  runTestCheck,
} from "./hygiene/index.ts";

/**
 * Check mode for the hygiene script
 *
 * @remarks
 * The mode is typically provided via the `CHECK_MODE` environment variable in
 * GitHub Actions and controls which portion of the hygiene pipeline is
 * executed.
 */
export type CheckMode = "detect" | "format" | "lint" | "test" | "stats" | "summary";

/**
 * Artifact directory for hygiene check results
 *
 * @remarks
 * The workflow downloads artifacts into this folder before `summary` mode runs.
 */
const ARTIFACT_DIR = "artifacts/hygiene";
const BLOCKING_CHECKS = ["format", "lint", "test"] as const;

type BlockingCheckType = (typeof BLOCKING_CHECKS)[number];

function isBlockingCheck(check: string): check is BlockingCheckType {
  return BLOCKING_CHECKS.includes(check as BlockingCheckType);
}

// =============================================================================
// CHANGE DETECTION (unchanged from v1)
// =============================================================================

/**
 * Detects file changes between two Git references
 *
 * @remarks
 * This mode is used as a lightweight gate to decide whether expensive steps
 * should run.
 *
 * Outputs:
 * - `has-changes`: `true` if at least one file changed
 * - `changed-files`: comma-separated list of changed files
 * - `changed-files-count`: count of changed files
 *
 * @returns A promise that resolves when outputs are set.
 */
async function detectChanges(): Promise<void> {
  const baseRef = env.get("BASE_REF", "origin/main") ?? "origin/main";
  const headRef = env.get("HEAD_REF") ?? env.get("GITHUB_SHA") ?? "HEAD";

  core.info(`🔍 Detecting changes between '${baseRef}' and '${headRef}'`);

  try {
    // Ensure base branch is fetched
    if (baseRef === "origin/main" || baseRef.endsWith("main")) {
      await git.fetchBranch("main", "origin");
    }

    const changedFiles = await git.getChangedFiles(baseRef, headRef);
    const hasChanges = changedFiles.length > 0;

    core.setOutput("has-changes", hasChanges ? "true" : "false");
    core.setOutput("changed-files", changedFiles.join(","));
    core.setOutput("changed-files-count", changedFiles.length.toString());

    core.info(`✅ Change detection complete: ${changedFiles.length} file(s) changed`);
  } catch (error) {
    const err = error as Error;
    core.error(`❌ Change detection failed: ${err.message}`);
    core.setOutput("has-changes", "false");
    core.setOutput("changed-files", "");
    core.setOutput("changed-files-count", "0");
    throw err;
  }
}

// =============================================================================
// SUMMARY - AGGREGATE ARTIFACTS AND POST COMMENT
// =============================================================================

/**
 * Loads a check result from artifact file
 *
 * @remarks
 * Returns `undefined` when the artifact is missing or unreadable so the summary
 * report can degrade gracefully (e.g., partial results).
 *
 * @param checkType - The check name (e.g. `format`, `lint`, `test`, `stats`).
 * @returns A parsed check result, or `undefined` when not available.
 */
async function loadCheckResult(checkType: string): Promise<HygieneCheckResult | undefined> {
  const workspaceRoot = process.env["GITHUB_WORKSPACE"] ?? process.cwd();
  const artifactPath = path.join(workspaceRoot, ARTIFACT_DIR, `${checkType}-result.json`);

  try {
    const content = await fs.readFile(artifactPath, "utf-8");
    return JSON.parse(content) as HygieneCheckResult;
  } catch {
    core.warning(`Could not load ${checkType} result from ${artifactPath}`);
    return undefined;
  }
}

export function getBlockingHygieneFailures(checks: {
  readonly format?: HygieneCheckResult;
  readonly lint?: HygieneCheckResult;
  readonly test?: HygieneCheckResult;
}): readonly string[] {
  return BLOCKING_CHECKS.flatMap((check) => {
    const result = checks[check];
    if (!result) {
      return [`${check}: missing result artifact`];
    }

    if (result.status === "failure" || result.status === "error") {
      return [`${check}: ${result.summary}`];
    }

    return [];
  });
}

function failBlockingCheckIfNeeded(mode: CheckMode, result: HygieneCheckResult): void {
  if (isBlockingCheck(mode) && (result.status === "failure" || result.status === "error")) {
    core.setFailed(`${mode} check ${result.status}: ${result.summary}`);
  }
}

function createChecksMap(
  format: HygieneCheckResult | undefined,
  lint: HygieneCheckResult | undefined,
  test: HygieneCheckResult | undefined,
  stats: HygieneCheckResult | undefined,
): {
  format?: HygieneCheckResult;
  lint?: HygieneCheckResult;
  test?: HygieneCheckResult;
  stats?: HygieneCheckResult;
} {
  const checks: {
    format?: HygieneCheckResult;
    lint?: HygieneCheckResult;
    test?: HygieneCheckResult;
    stats?: HygieneCheckResult;
  } = {};

  if (format) {
    checks.format = format;
  }

  if (lint) {
    checks.lint = lint;
  }

  if (test) {
    checks.test = test;
  }

  if (stats) {
    checks.stats = stats;
  }

  return checks;
}

/**
 * Aggregates all check results and posts PR comment
 *
 * @remarks
 * This mode reads the check artifacts produced by other workflow jobs, builds a
 * unified report comment, and posts it to the PR when `PR_NUMBER` is present.
 *
 * @returns A promise that resolves when the comment is posted (or skipped) and
 * outputs are set.
 */
async function runSummary(): Promise<void> {
  core.info("📋 Running summary job...");

  // Load all check results from downloaded artifacts
  const [formatResult, lintResult, testResult, statsResult] = await Promise.all([
    loadCheckResult("format"),
    loadCheckResult("lint"),
    loadCheckResult("test"),
    loadCheckResult("stats"),
  ]);

  // Get workflow context
  const commitSha = env.get("GITHUB_SHA") ?? "unknown";
  const prNumber = parseInt(env.get("PR_NUMBER") ?? "0", 10) || undefined;
  const runId = env.get("GITHUB_RUN_ID") ?? "unknown";
  const serverUrl = env.get("GITHUB_SERVER_URL") ?? "https://github.com";
  const repository = env.get("GITHUB_REPOSITORY") ?? "";
  const workflowRunUrl = `${serverUrl}/${repository}/actions/runs/${runId}`;

  // Create the report
  const checks = createChecksMap(formatResult, lintResult, testResult, statsResult);

  const reportOptions = {
    checks,
    commitSha,
    workflowRunId: runId,
    workflowRunUrl,
    ...(prNumber ? {prNumber} : {}),
  };

  const report: HygieneReport = createHygieneReport(reportOptions);

  // Log summary
  core.info(`Overall status: ${report.overallStatus}`);
  core.info(`Checks loaded: format=${!!formatResult}, lint=${!!lintResult}, test=${!!testResult}, stats=${!!statsResult}`);

  // Build comment
  const commentBody = buildHygieneComment(report);

  // Post to PR if we have a PR number
  if (prNumber) {
    const token = env.getRequired("GITHUB_TOKEN");
    const gh = createGitHubHelper(token);

    core.info(`📝 Posting comment to PR #${prNumber}`);

    try {
      // Use a consistent identifier to update existing comment instead of creating duplicates
      // This keeps PR history clean while still showing latest results
      await gh.upsertComment(prNumber, commentBody, HYGIENE_COMMENT_IDENTIFIER);
      core.info("✅ Comment posted/updated successfully");
    } catch (error) {
      const err = error as Error;
      core.error(`❌ Failed to post comment: ${err.message}`);
      // Don't fail the workflow for comment errors
      core.warning("Comment posting failed but continuing");
    }
  } else {
    core.info("Not in PR context - skipping comment");
  }

  // Set outputs
  core.setOutput("overall-status", report.overallStatus);
  core.setOutput("report", JSON.stringify(report));

  const blockingFailures = getBlockingHygieneFailures(checks);

  if (blockingFailures.length > 0) {
    core.setFailed(`Blocking hygiene checks failed: ${blockingFailures.join("; ")}`);
  }
}

// =============================================================================
// MAIN ENTRY POINT
// =============================================================================

/**
 * Main orchestrator function
 *
 * @remarks
 * Reads `CHECK_MODE` and delegates to the appropriate sub-operation.
 *
 * This function is safe to call in non-PR contexts; comment posting is skipped
 * when `PR_NUMBER` is not set.
 *
 * @returns A promise that resolves when the selected mode completes.
 */
export default async function runHygieneCheck(): Promise<void> {
  const mode = (env.get("CHECK_MODE") ?? "stats") as CheckMode;

  core.info(`🧹 Running hygiene check in '${mode}' mode`);

  try {
    switch (mode) {
      case "detect":
        await detectChanges();
        break;

      case "format":
        failBlockingCheckIfNeeded(mode, await runFormatCheck());
        break;

      case "lint":
        failBlockingCheckIfNeeded(mode, await runLintCheck());
        break;

      case "test":
        failBlockingCheckIfNeeded(mode, await runTestCheck());
        break;

      case "stats":
        await runStatsCheck();
        break;

      case "summary":
        await runSummary();
        break;

      default:
        core.setFailed(`Unknown check mode: ${mode}`);
    }
  } catch (error) {
    const err = error as Error;
    core.error(`❌ Hygiene check failed: ${err.message}`);
    core.setFailed(err.message);
  }
}
