/**
 * @fileoverview Creates comprehensive PR comments with test results and bundle analysis
 * @module src/create-pr-comment
 */

import {compareBundleSizes, generateBundleSizeMarkdown} from "../lib/bundle-size-helper.ts";
import {BUNDLE_TARGET_FOLDERS} from "../lib/constants.ts";
import {getBranchCommitComparisonSection} from "../lib/git-helper.ts";
import getJestResultsSection from "../lib/jest-helper.ts";
import getPlaywrightResultsSection from "../lib/playwright-helper.ts";
import {generateWorkflowInfoSection} from "../lib/pr-comment-builder.ts";
import type {ScriptParams, WorkflowInfo} from "../types/index.ts";

/**
 * Validates and parses the PR number from the PR_NUMBER environment variable
 * @returns PR number as integer, or null if invalid/not set
 * @example
 * ```typescript
 * const prNum = getPRNumber();
 * if (prNum === null) {
 *   console.log('No valid PR found');
 * }
 * ```
 */
function getPRNumber(): number | null {
  const prNumberStr = process.env["PR_NUMBER"];

  if (!prNumberStr || prNumberStr === "null" || prNumberStr === "" || prNumberStr === "undefined") {
    console.log(`No open PR found for this commit (PR_NUMBER: ${prNumberStr}), or PR_NUMBER env var not set correctly. Skipping comment.`);
    return null;
  }

  const prNumber = Number.parseInt(prNumberStr, 10);
  if (Number.isNaN(prNumber)) {
    console.log(`Invalid PR_NUMBER: ${prNumberStr}. Skipping comment.`);
    return null;
  }

  return prNumber;
}

/**
 * Extracts and validates required environment variables for PR comment creation
 * @param core - GitHub Actions core utilities for error reporting
 * @returns Object containing commit SHA, run ID, branch name, and job status; or null if any required variable is missing
 * @example
 * ```typescript
 * const vars = extractEnvironmentVariables(core);
 * if (!vars) {
 *   throw new Error('Missing required environment variables');
 * }
 * console.log(`Processing commit ${vars.currentCommitSha}`);
 * ```
 */
function extractEnvironmentVariables(core: ScriptParams["core"]): {
  currentCommitSha: string;
  runId: string;
  branchName: string;
  jobStatus: string;
} | null {
  const currentCommitSha = process.env["COMMIT_SHA"];
  const runId = process.env["RUN_ID"];
  const branchName = process.env["BRANCH_NAME"];
  const jobStatus = process.env["JOB_STATUS"] ?? "unknown";

  if (!currentCommitSha || !runId || !branchName) {
    core.setFailed("Missing one or more essential environment variables (COMMIT_SHA, RUN_ID, BRANCH_NAME). Cannot create PR comment.");
    return null;
  }

  return {currentCommitSha, runId, branchName, jobStatus};
}

/**
 * Generates the bundle size comparison section with error handling
 * @param params - The script parameters
 * @param targetFolders - An array of folder paths to compare
 * @returns Markdown string for the bundle size comparison section
 */
async function getBundleSizeComparisonSection(params: ScriptParams, targetFolders: string[]): Promise<string> {
  const {core} = params;

  try {
    const comparisons = await compareBundleSizes(params, targetFolders);
    return generateBundleSizeMarkdown(comparisons);
  } catch (error) {
    const err = error as Error;
    core.error(`Failed to generate bundle size comparison: ${err.message}`);
    return `### 📦 Bundle Size Analysis (vs. Main)\n\n_Error generating bundle size comparison: ${err.message}_\n\n----\n`;
  }
}

/**
 * Builds the complete PR comment body
 * @param params - Script parameters
 * @param workflowInfo - Workflow and PR information
 * @param currentCommitSha - Full commit SHA
 * @returns Promise resolving to the complete comment body
 */
async function buildCommentBody(params: ScriptParams, workflowInfo: WorkflowInfo, currentCommitSha: string): Promise<string> {
  const {core} = params;
  let commentBody = "";

  core.debug("Building workflow info section...");
  // Add workflow info section
  commentBody += generateWorkflowInfoSection(workflowInfo);

  core.debug("Building branch/commit comparison section...");
  // Add branch/commit comparison
  commentBody += await getBranchCommitComparisonSection(params, currentCommitSha, workflowInfo.shortCurrentCommitSha);

  core.debug("Building Jest test results section...");
  // Add test results
  commentBody += await getJestResultsSection(core);

  core.debug("Building Playwright test results section...");
  commentBody += await getPlaywrightResultsSection(workflowInfo.jobStatus, workflowInfo.workflowRunUrl);

  core.debug("Building bundle size comparison section...");
  // Add bundle size analysis
  commentBody += await getBundleSizeComparisonSection(params, BUNDLE_TARGET_FOLDERS);

  core.debug(`Comment body assembled: ${commentBody.split("\n").length} lines`);
  return commentBody;
}

/**
 * Main function to create a comment on a pull request with test and build results.
 * @param params - The script parameters.
 * @returns A promise that resolves when the comment is created or if the process is skipped.
 */
export default async function createPRComment(params: ScriptParams): Promise<void> {
  const {github: octokit, context, core} = params;

  core.info("🚀 Starting PR comment creation process...");

  // Validate PR number
  core.debug("Validating PR number...");
  const prNumber = getPRNumber();
  if (prNumber === null) {
    core.warning("⏭️ No PR number found - skipping comment creation");
    return;
  }
  core.info(`📋 Target PR: #${prNumber}`);

  // Extract and validate environment variables
  core.debug("Extracting environment variables...");
  const envVars = extractEnvironmentVariables(core);
  if (envVars === null) {
    core.error("❌ Missing required environment variables");
    return;
  }

  const {currentCommitSha, runId, branchName, jobStatus} = envVars;
  const repoOwner = context.repo.owner;
  const repoName = context.repo.repo;

  core.info(`🔧 Workflow context: ${repoOwner}/${repoName}, Branch: ${branchName}, Status: ${jobStatus}`);
  core.debug(`Commit SHA: ${currentCommitSha}, Run ID: ${runId}`);

  // Build URLs and metadata
  const shortCurrentCommitSha = currentCommitSha.substring(0, 7);
  const workflowRunUrl = `https://github.com/${repoOwner}/${repoName}/actions/runs/${runId}`;
  const commitUrl = `https://github.com/${repoOwner}/${repoName}/commit/${currentCommitSha}`;
  const prUrl = `https://github.com/${repoOwner}/${repoName}/pull/${prNumber}`;

  const workflowInfo: WorkflowInfo = {
    prNumber,
    prUrl,
    runId,
    workflowRunUrl,
    shortCurrentCommitSha,
    commitUrl,
    branchName,
    jobStatus,
  };

  // Build comment body
  core.info("📝 Building comment body with test results and analysis...");
  const commentBody = await buildCommentBody(params, workflowInfo, currentCommitSha);
  core.debug(`Comment body length: ${commentBody.length} characters`);

  // Post comment to PR
  try {
    core.info(`💬 Posting comment to PR #${prNumber}...`);
    await octokit.rest.issues.createComment({
      owner: repoOwner,
      repo: repoName,
      issue_number: prNumber,
      body: commentBody,
    });
    core.info(`✓ Successfully commented on PR #${prNumber}`);
    core.notice(`PR comment posted: ${prUrl}`);
    console.log(`Successfully commented on PR #${prNumber}.`);
  } catch (error) {
    const err = error as Error;
    core.error(`❌ Failed to create PR comment: ${err.message}`);
    core.error(`Stack trace: ${err.stack ?? "No stack trace available"}`);
    core.setFailed(`Failed to create PR comment for PR #${prNumber}: ${err.message}`);
  }
}
