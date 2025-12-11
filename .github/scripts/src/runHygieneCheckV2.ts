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
 */
export type CheckMode = "detect" | "format" | "lint" | "test" | "stats" | "summary";

/**
 * Artifact directory for hygiene check results
 */
const ARTIFACT_DIR = "artifacts/hygiene";

// =============================================================================
// CHANGE DETECTION (unchanged from v1)
// =============================================================================

/**
 * Detects file changes between two Git references
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

/**
 * Aggregates all check results and posts PR comment
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
  const report: HygieneReport = createHygieneReport({
    checks: {
      format: formatResult,
      lint: lintResult,
      test: testResult,
      stats: statsResult,
    },
    commitSha,
    prNumber,
    workflowRunId: runId,
    workflowRunUrl,
  });

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
      // Use a unique identifier per workflow run so each run creates a new comment
      // This fulfills the user requirement: "comment should be outputted everytime"
      const uniqueCommentId = `${HYGIENE_COMMENT_IDENTIFIER}-run-${runId}`;
      await gh.upsertComment(prNumber, commentBody, uniqueCommentId);
      core.info("✅ Comment posted successfully");
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

  // Fail if any check failed
  if (report.overallStatus === "failure" || report.overallStatus === "error") {
    core.setFailed(`Hygiene checks ${report.overallStatus}`);
  }
}

// =============================================================================
// MAIN ENTRY POINT
// =============================================================================

/**
 * Main orchestrator function
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
        await runFormatCheck();
        break;

      case "lint":
        await runLintCheck();
        break;

      case "test":
        await runTestCheck();
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
