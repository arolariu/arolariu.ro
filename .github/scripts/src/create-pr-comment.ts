/**
 * @fileoverview Core pull request comment creation utilities
 * @module src/create-pr-comment
 *
 * @refactored Uses new GitHub helper for cleaner API
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
 * @example
 * ```typescript
 * // In a specific comment generator
 * import { createPRComment } from './create-pr-comment.ts';
 *
 * const commentMarkdown = generateMyCommentContent();
 * await createPRComment(commentMarkdown);
 * ```
 */

import * as core from "@actions/core";
import { env, createGitHubHelper } from "../helpers/index.ts";

/**
 * Creates a comment on a pull request with the provided markdown content
 *
 * @refactored Uses new GitHub helper - no params needed
 *
 * @param commentBody - Pre-formatted markdown content to post as the PR comment
 * @returns Promise that resolves when the comment is posted successfully or skipped gracefully
 *
 * @example
 * ```typescript
 * await createPRComment('## ✅ Build Successful\n\nAll checks passed!');
 * ```
 */
export async function createPRComment(commentBody: string): Promise<void> {
  core.info("🚀 Starting PR comment creation process...");

  // Get GitHub token
  const token = env.getRequired("GITHUB_TOKEN");
  const gh = createGitHubHelper(token);

  // Validate PR context
  const pr = gh.getPullRequest();
  if (!pr) {
    core.warning("⏭️ No PR context found - skipping comment creation");
    return;
  }

  core.info(`📋 Target PR: #${pr.number} (${pr.url})`);

  try {
    // Post comment
    await gh.postPullRequestComment(pr.number, commentBody);
    core.info(`✓ Successfully commented on PR #${pr.number}`);
  } catch (error) {
    const err = error as Error;
    core.warning(`⚠️ Failed to post comment to PR #${pr.number}: ${err.message}`);
  }
}

/**
 * Default export for GitHub Actions usage
 */
export default createPRComment;
