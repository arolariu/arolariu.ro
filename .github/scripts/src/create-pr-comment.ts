/**
 * @fileoverview Core PR comment creation utilities
 * @module src/create-pr-comment
 *
 * This module provides the foundational logic for creating comments on pull requests.
 * It handles PR context validation and comment posting with proper error handling.
 * Specific comment generation logic should be implemented in separate modules.
 */

import {getPRContext, postPRComment} from "../lib/pr-helper.ts";
import type {ScriptParams} from "../types/index.ts";

/**
 * Creates a comment on a pull request with the provided content.
 * This is a generic function that handles PR validation and comment posting.
 *
 * @param params - Script execution parameters containing GitHub client and context
 * @param commentBody - Markdown content for the PR comment
 * @returns Promise that resolves when the comment is posted or skipped
 *
 * @example
 * ```typescript
 * await createPRComment(params, '## Build Results\n\nBuild completed successfully!');
 * ```
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
