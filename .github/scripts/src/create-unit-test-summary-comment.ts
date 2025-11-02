/**
 * @fileoverview Generates comprehensive PR comments with unit test results and bundle analysis
 * @module src/create-unit-test-summary-comment
 *
 * This module creates detailed pull request comments that provide a complete overview of:
 * - **Workflow Information**: Commit details, branch name, and run status
 * - **Code Changes**: Branch and commit comparison statistics
 * - **Unit Test Coverage**: Vitest test results with coverage percentages
 * - **E2E Test Results**: Playwright end-to-end test outcomes
 * - **Bundle Size Analysis**: Build artifact size comparisons against main branch
 *
 * The comment generation is optimized for performance by running independent sections
 * in parallel where possible, and includes comprehensive error handling to ensure
 * partial results are still reported even if individual sections fail.
 *
 * @example
 * ```typescript
 * // Called from GitHub Actions workflow
 * const { default: createUnitTestSummaryComment } = await import('./create-unit-test-summary-comment.ts');
 * await createUnitTestSummaryComment({ github, context, core, exec });
 * ```
 *
 * @see {@link createPRComment} - Core PR comment posting functionality
 * @see {@link extractWorkflowContext} - Workflow environment variable extraction
 */

import {createPRComment} from "./create-pr-comment.ts";
import {compareBundleSizes, generateBundleSizeMarkdown} from "../lib/bundle-size-helper.ts";
import {BUNDLE_TARGET_FOLDERS} from "../lib/constants.ts";
import {extractWorkflowContext} from "../lib/env-helper.ts";
import {getBranchCommitComparisonSection} from "../lib/git-helper.ts";
import getVitestResultsSection from "../lib/vitest-helper.ts";
import getPlaywrightResultsSection from "../lib/playwright-helper.ts";
import {generateWorkflowInfoSection} from "../lib/pr-comment-builder.ts";
import type {ScriptParams, WorkflowInfo} from "../types/index.ts";

/**
 * Generates the bundle size comparison section with comprehensive error handling
 *
 * Compares bundle sizes between the current branch and the main branch, providing
 * a detailed markdown table showing size changes for each target folder.
 *
 * @param params - Script execution parameters containing GitHub client and utilities
 * @param targetFolders - Array of folder paths to analyze for bundle size comparison
 * @returns Promise resolving to markdown-formatted bundle size comparison section
 *
 * @remarks
 * - If bundle size analysis fails, returns an error message instead of failing the entire comment
 * - Errors are logged via core.error for debugging without blocking other sections
 * - Performance: Runs independently and can be executed in parallel with other sections
 *
 * @example
 * ```typescript
 * const bundleSection = await getBundleSizeComparisonSection(params, ['dist', 'build']);
 * // Returns: "### 📦 Bundle Size Analysis (vs. Main)\n\n| File | Size | Change |\n..."
 * ```
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
 * Builds the complete unit test summary PR comment body by aggregating multiple analysis sections
 *
 * This function orchestrates the generation of all comment sections in a specific order:
 * 1. Workflow information (commit, branch, run status)
 * 2. Branch/commit comparison statistics
 * 3. Vitest unit test coverage results
 * 4. Playwright E2E test results
 * 5. Bundle size analysis
 *
 * @param params - Script execution parameters containing GitHub client and utilities
 * @param workflowInfo - Workflow and PR metadata including URLs and identifiers
 * @param currentCommitSha - Full SHA hash of the commit being analyzed
 * @returns Promise resolving to complete markdown-formatted comment body
 *
 * @remarks
 * - Each section is generated independently with its own error handling
 * - Failed sections are replaced with error messages rather than failing the entire comment
 * - Debug logging is provided for each section to aid in troubleshooting
 * - The function is optimized for readability and maintainability over performance
 *
 * @example
 * ```typescript
 * const commentBody = await buildUnitTestSummaryCommentBody(params, workflowInfo, 'abc123...');
 * // Returns comprehensive markdown with all test results and analysis
 * ```
 */
async function buildUnitTestSummaryCommentBody(params: ScriptParams, workflowInfo: WorkflowInfo, currentCommitSha: string): Promise<string> {
  const {core} = params;
  let commentBody = "";

  core.debug("Building workflow info section...");
  // Add workflow info section
  commentBody += generateWorkflowInfoSection(workflowInfo);

  core.debug("Building branch/commit comparison, Vitest, Playwright, and bundle size sections in parallel...");
  // Start all independent async operations in parallel
  const [
    branchCommitComparisonSection,
    vitestResultsSection,
    playwrightResultsSection,
    bundleSizeComparisonSection,
  ] = await Promise.all([
    getBranchCommitComparisonSection(params, currentCommitSha, workflowInfo.shortCurrentCommitSha),
    getVitestResultsSection(core),
    getPlaywrightResultsSection(workflowInfo.jobStatus, workflowInfo.workflowRunUrl),
    getBundleSizeComparisonSection(params, BUNDLE_TARGET_FOLDERS),
  ]);

  // Concatenate results in order
  commentBody += branchCommitComparisonSection;
  commentBody += vitestResultsSection;
  commentBody += playwrightResultsSection;
  commentBody += bundleSizeComparisonSection;
  core.debug(`Comment body assembled: ${commentBody.split("\n").length} lines`);
  return commentBody;
}

/**
 * Creates a comprehensive PR comment with unit test results and build analysis
 *
 * This is the main entry point for generating unit test summary comments. It orchestrates
 * the entire process from environment validation to comment posting:
 *
 * 1. **Environment Validation**: Extracts and validates required workflow context
 * 2. **Metadata Construction**: Builds URLs and workflow information objects
 * 3. **Content Generation**: Aggregates test results, coverage, and bundle analysis
 * 4. **Comment Posting**: Uses the core PR comment utility to post to GitHub
 *
 * @param params - Script execution parameters containing GitHub client, context, and utilities
 * @returns Promise that resolves when the comment is successfully posted or skipped
 *
 * @remarks
 * - **Performance**: Content generation runs serially for predictable ordering
 * - **Error Handling**: Missing environment variables cause early return without throwing
 * - **Extensibility**: Easy to add new sections by modifying buildUnitTestSummaryCommentBody
 * - **Reusability**: Leverages shared utilities (extractWorkflowContext, createPRComment)
 *
 * @example
 * ```typescript
 * // Typical usage in GitHub Actions workflow
 * const { default: createUnitTestSummaryComment } = await import('./create-unit-test-summary-comment.ts');
 * await createUnitTestSummaryComment({ github, context, core, exec });
 * ```
 *
 * @see {@link extractWorkflowContext} - Validates and extracts workflow environment variables
 * @see {@link buildUnitTestSummaryCommentBody} - Generates the comment content
 * @see {@link createPRComment} - Posts the comment to the pull request
 */
export default async function createUnitTestSummaryComment(params: ScriptParams): Promise<void> {
  const {context, core} = params;

  core.info("🧪 Starting unit test summary comment generation...");

  // Extract and validate workflow context from environment variables
  core.debug("Extracting workflow context from environment...");
  const workflowContext = extractWorkflowContext(core);
  if (workflowContext === null) {
    core.error("❌ Cannot proceed without valid workflow context");
    return;
  }

  const {commitSha, runId, branchName, jobStatus} = workflowContext;
  const repoOwner = context.repo.owner;
  const repoName = context.repo.repo;

  core.info(`🔧 Workflow context: ${repoOwner}/${repoName}, Branch: ${branchName}, Status: ${jobStatus}`);
  core.debug(`Commit SHA: ${commitSha.substring(0, 7)}..., Run ID: ${runId}`);

  // Build URLs and metadata for the comment
  // Note: PR number is extracted and validated by createPRComment
  const shortCommitSha = commitSha.substring(0, 7);
  const workflowRunUrl = `https://github.com/${repoOwner}/${repoName}/actions/runs/${runId}`;
  const commitUrl = `https://github.com/${repoOwner}/${repoName}/commit/${commitSha}`;

  // Construct workflow information object for comment generation
  // PR context (number, URL) is now resolved by getPRContext; not included here
  const workflowInfo: WorkflowInfo = {
    runId,
    workflowRunUrl,
    shortCurrentCommitSha: shortCommitSha,
    commitUrl,
    branchName,
    jobStatus,
  };

  // Generate the complete comment body with all test results and analysis
  core.info("📝 Building comprehensive comment body with test results and analysis...");
  const commentBody = await buildUnitTestSummaryCommentBody(params, workflowInfo, commitSha);
  core.debug(`✓ Comment body assembled: ${commentBody.length} characters, ${commentBody.split("\n").length} lines`);

  // Post the comment to the pull request using the core utility function
  await createPRComment(params, commentBody);
}
