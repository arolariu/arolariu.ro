/**
 * @fileoverview Core pull request comment creation utilities
 * @module src/create-pr-comment
 *
 * This module provides the foundational, reusable logic for posting comments to GitHub
 * pull requests. It serves as a generic utility that can be used by any comment generation
 * module (e.g., unit test summaries, hygiene checks, build reports).
 *
 * **Key Features:**
 * - **PR Context Validation**: Automatically validates PR number from environment
 * - **Error Handling**: Graceful failure without breaking workflows
 * - **Logging**: Comprehensive debug and info logging for observability
 * - **Reusability**: Accepts pre-formatted markdown content from any source
 *
 * **Design Philosophy:**
 * This module intentionally focuses on the "how" (posting) rather than the "what" (content).
 * Content generation should be delegated to specific modules that import and use this utility.
 *
 * @example
 * ```typescript
 * // In a specific comment generator (e.g., create-unit-test-summary-comment.ts)
 * import { createPRComment } from './create-pr-comment.ts';
 *
 * const commentMarkdown = generateMyCommentContent();
 * await createPRComment(params, commentMarkdown);
 * ```
 *
 * @see {@link getPRContext} - Validates and extracts PR context from environment
 * @see {@link postPRComment} - Low-level GitHub API comment posting
 */

import {getPRContext, postPRComment} from "../lib/pr-helper.ts";
import type {ScriptParams} from "../types/index.ts";

/**
 * Creates a comment on a pull request with the provided markdown content
 *
 * This is the core utility function for posting PR comments. It handles all the
 * orchestration needed to safely post a comment:
 *
 * 1. **PR Context Validation**: Checks if running in a PR context (via PR_NUMBER env var)
 * 2. **Comment Posting**: Uses the GitHub API to create the comment
 * 3. **Error Handling**: Logs failures without throwing to prevent workflow breakage
 *
 * @param params - Script execution parameters containing GitHub Octokit client and context
 * @param commentBody - Pre-formatted markdown content to post as the PR comment
 * @returns Promise that resolves when the comment is posted successfully or skipped gracefully
 *
 * @remarks
 * - **Non-throwing**: This function never throws; failures are logged and the workflow continues
 * - **PR Number Source**: Reads from `PR_NUMBER` environment variable (set by workflow)
 * - **Performance**: Minimal overhead; validation and posting are optimized for speed
 * - **Extensibility**: Can be used by any module that needs to post PR comments
 *
 * @example
 * ```typescript
 * // Simple usage with static content
 * await createPRComment(params, '## ✅ Build Successful\n\nAll checks passed!');
 *
 * // Usage with dynamically generated content
 * const testResults = await generateTestResultsMarkdown();
 * await createPRComment(params, testResults);
 *
 * // Function returns normally even if PR context is missing
 * await createPRComment(params, 'This will be skipped if not in PR context');
 * ```
 *
 * @see {@link getPRContext} - Validates PR context and extracts metadata
 * @see {@link postPRComment} - Performs the actual GitHub API call
 */
export async function createPRComment(params: ScriptParams, commentBody: string): Promise<void> {
  const {core} = params;

  core.info("🚀 Starting PR comment creation process...");

  // Validate PR context
  const prContext = getPRContext(params);
  if (prContext === null) {
    core.warning("⏭️ No PR context found - skipping comment creation");
    return;
  }

  const {prNumber, prUrl} = prContext;
  core.info(`📋 Target PR: #${prNumber} (${prUrl})`);

  // Post comment
  const success = await postPRComment(params, prNumber, commentBody);

  if (success) {
    core.info(`✓ Successfully commented on PR #${prNumber}`);
  } else {
    core.warning(`⚠️ Failed to post comment to PR #${prNumber}`);
  }
}

/**
 * Default export for backwards compatibility and GitHub Actions usage
 */
export default createPRComment;
