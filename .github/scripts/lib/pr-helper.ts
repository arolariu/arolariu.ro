/**
 * @fileoverview Pull Request helper utilities for GitHub Actions
 * @module lib/pr-helper
 */

import type {ScriptParams} from "../types/index.ts";

/**
 * Validates and extracts the PR number from environment variables
 * @param core - GitHub Actions core utilities for logging
 * @returns PR number as integer, or null if invalid/not set
 * @throws Never throws, returns null for invalid cases
 * @example
 * ```typescript
 * const prNumber = getPRNumber(core);
 * if (prNumber === null) {
 *   core.warning('No valid PR found');
 *   return;
 * }
 * console.log(`Processing PR #${prNumber}`);
 * ```
 */
export function getPRNumber(core: ScriptParams["core"]): number | null {
  const prNumberStr = process.env["PR_NUMBER"];

  if (!prNumberStr || prNumberStr === "null" || prNumberStr === "" || prNumberStr === "undefined") {
    core.info("No PR number found in environment (PR_NUMBER not set or invalid)");
    return null;
  }

  const prNumber = Number.parseInt(prNumberStr, 10);
  if (Number.isNaN(prNumber)) {
    core.warning(`Invalid PR_NUMBER: '${prNumberStr}' - expected a numeric value`);
    return null;
  }

  core.debug(`Extracted PR number: ${prNumber}`);
  return prNumber;
}

/**
 * Posts a comment to a GitHub pull request with comprehensive error handling
 * @param params - Script execution parameters containing GitHub client and context
 * @param prNumber - Pull request number to comment on
 * @param commentBody - Markdown content for the comment
 * @returns Promise that resolves when comment is posted successfully
 * @throws Never throws, logs errors via core utilities instead
 * @example
 * ```typescript
 * const success = await postPRComment(
 *   params,
 *   123,
 *   '## Test Results\n\n✅ All tests passed!'
 * );
 * if (success) {
 *   console.log('Comment posted successfully');
 * }
 * ```
 */
export async function postPRComment(params: ScriptParams, prNumber: number, commentBody: string): Promise<boolean> {
  const {github, context, core} = params;

  try {
    core.info(`💬 Posting comment to PR #${prNumber}...`);
    core.debug(`Comment length: ${commentBody.length} characters`);

    await github.rest.issues.createComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: prNumber,
      body: commentBody,
    });

    core.info(`✅ Successfully posted comment to PR #${prNumber}`);
    core.notice(`PR comment posted: https://github.com/${context.repo.owner}/${context.repo.repo}/pull/${prNumber}`);

    return true;
  } catch (error) {
    const err = error as Error;
    core.error(`❌ Failed to post comment to PR #${prNumber}: ${err.message}`);
    core.debug(`Stack trace: ${err.stack ?? "No stack trace available"}`);

    // Don't fail the workflow, just log the error
    core.warning("Comment posting failed but continuing workflow execution");

    return false;
  }
}

/**
 * Checks if the current workflow execution is in a pull request context
 * @param core - GitHub Actions core utilities for logging
 * @returns True if a valid PR number exists in environment, false otherwise
 * @example
 * ```typescript
 * if (!isPRContext(core)) {
 *   core.info('Not a PR context - skipping PR-specific actions');
 *   return;
 * }
 * ```
 */
export function isPRContext(core: ScriptParams["core"]): boolean {
  const prNumber = getPRNumber(core);
  return prNumber !== null;
}

/**
 * Gets PR context information including number, owner, and repo
 * @param params - Script execution parameters
 * @returns Object with PR number, owner, and repo name, or null if not in PR context
 * @example
 * ```typescript
 * const prContext = getPRContext(params);
 * if (prContext) {
 *   const { prNumber, owner, repo } = prContext;
 *   console.log(`PR #${prNumber} in ${owner}/${repo}`);
 * }
 * ```
 */
export function getPRContext(params: ScriptParams): {prNumber: number; owner: string; repo: string; prUrl: string} | null {
  const {context, core} = params;
  const prNumber = getPRNumber(core);

  if (prNumber === null) {
    return null;
  }

  const owner = context.repo.owner;
  const repo = context.repo.repo;
  const prUrl = `https://github.com/${owner}/${repo}/pull/${prNumber}`;

  return {prNumber, owner, repo, prUrl};
}
