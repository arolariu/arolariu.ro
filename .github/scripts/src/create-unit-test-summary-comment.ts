/**
 * @fileoverview Creates comprehensive PR comments with unit test results and bundle analysis
 * @module src/create-unit-test-summary-comment
 *
 * This module generates detailed PR comments that include:
 * - Workflow information and commit details
 * - Branch/commit comparison
 * - Vitest unit test coverage results
 * - Playwright E2E test results
 * - Bundle size analysis
 */

import {createPRComment} from "./create-pr-comment.ts";
import {compareBundleSizes, generateBundleSizeMarkdown} from "../lib/bundle-size-helper.ts";
import {BUNDLE_TARGET_FOLDERS} from "../lib/constants.ts";
import {getBranchCommitComparisonSection} from "../lib/git-helper.ts";
import getVitestResultsSection from "../lib/vitest-helper.ts";
import getPlaywrightResultsSection from "../lib/playwright-helper.ts";
import {generateWorkflowInfoSection} from "../lib/pr-comment-builder.ts";
import type {ScriptParams, WorkflowInfo} from "../types/index.ts";

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
 * Builds the complete unit test summary PR comment body
 * @param params - Script parameters
 * @param workflowInfo - Workflow and PR information
 * @param currentCommitSha - Full commit SHA
 * @returns Promise resolving to the complete comment body with test results and analysis
 */
async function buildUnitTestSummaryCommentBody(params: ScriptParams, workflowInfo: WorkflowInfo, currentCommitSha: string): Promise<string> {
  const {core} = params;
  let commentBody = "";

  core.debug("Building workflow info section...");
  // Add workflow info section
  commentBody += generateWorkflowInfoSection(workflowInfo);

  core.debug("Building branch/commit comparison section...");
  // Add branch/commit comparison
  commentBody += await getBranchCommitComparisonSection(params, currentCommitSha, workflowInfo.shortCurrentCommitSha);

  core.debug("Building Vitest test results section...");
  // Add test results
  commentBody += await getVitestResultsSection(core);

  core.debug("Building Playwright test results section...");
  commentBody += await getPlaywrightResultsSection(workflowInfo.jobStatus, workflowInfo.workflowRunUrl);

  core.debug("Building bundle size comparison section...");
  // Add bundle size analysis
  commentBody += await getBundleSizeComparisonSection(params, BUNDLE_TARGET_FOLDERS);

  core.debug(`Comment body assembled: ${commentBody.split("\n").length} lines`);
  return commentBody;
}

/**
 * Main function to create a PR comment with unit test results and build analysis.
 * Orchestrates the gathering of test results, bundle sizes, and workflow information,
 * then uses the core createPRComment function to post the comment.
 *
 * @param params - The script parameters containing GitHub context and utilities
 * @returns A promise that resolves when the comment is created or if the process is skipped
 */
export default async function createUnitTestSummaryComment(params: ScriptParams): Promise<void> {
  const {context, core} = params;

  core.info("🧪 Starting unit test summary comment generation...");

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

  // Build URLs and metadata - Note: prNumber will be fetched by createPRComment
  const shortCurrentCommitSha = currentCommitSha.substring(0, 7);
  const workflowRunUrl = `https://github.com/${repoOwner}/${repoName}/actions/runs/${runId}`;
  const commitUrl = `https://github.com/${repoOwner}/${repoName}/commit/${currentCommitSha}`;

  // Temporary PR info - will be validated in createPRComment
  const workflowInfo: WorkflowInfo = {
    prNumber: 0, // Will be set by createPRComment
    prUrl: "", // Will be set by createPRComment
    runId,
    workflowRunUrl,
    shortCurrentCommitSha,
    commitUrl,
    branchName,
    jobStatus,
  };

  // Build comment body with test results and analysis
  core.info("📝 Building comment body with test results and analysis...");
  const commentBody = await buildUnitTestSummaryCommentBody(params, workflowInfo, currentCommitSha);
  core.debug(`Comment body assembled: ${commentBody.length} characters`);

  // Use the core PR comment function to post the comment
  await createPRComment(params, commentBody);
}
