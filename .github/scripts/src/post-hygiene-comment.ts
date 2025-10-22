/**
 * @fileoverview Posts a unified comprehensive code hygiene check result as a single PR comment
 * @module src/post-hygiene-comment
 */

import {getEnvVar} from "../lib/env-helper.ts";
import {getPRNumber} from "../lib/pr-helper.ts";
import {formatCommitSha, getStatusEmoji} from "../lib/status-helper.ts";
import type {ScriptParams} from "../types/index.ts";

/**
 * Unique identifier for the hygiene check comment
 */
const COMMENT_IDENTIFIER = "<!-- arolariu-hygiene-check-comment -->";

/**
 * Finds existing hygiene comment on the PR
 * @param params - Script parameters
 * @param prNumber - PR number
 * @returns Comment ID if found, null otherwise
 */
async function findExistingComment(params: ScriptParams, prNumber: number): Promise<number | null> {
  const {github, context, core} = params;

  try {
    const {data: comments} = await github.rest.issues.listComments({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: prNumber,
    });

    const existingComment = comments.find((comment) => comment.body?.includes(COMMENT_IDENTIFIER));

    if (existingComment) {
      core.info(`Found existing hygiene comment #${existingComment.id}`);
      return existingComment.id;
    }

    return null;
  } catch (error) {
    const err = error as Error;
    core.warning(`Failed to search for existing comment: ${err.message}`);
    return null;
  }
}

/**
 * Generates the unified comprehensive hygiene comment
 * @param params - Script parameters
 * @returns Markdown string for the complete hygiene check report
 */
function generateUnifiedComment(params: ScriptParams): string {
  const {core} = params;

  // Get all status information
  const statsResult = getEnvVar("STATS_RESULT", "unknown");
  const formattingResult = getEnvVar("FORMATTING_RESULT", "unknown");
  const lintingResult = getEnvVar("LINTING_RESULT", "unknown");

  // Get statistics
  const filesChanged = getEnvVar("FILES_CHANGED", "0");
  const linesAdded = getEnvVar("LINES_ADDED", "0");
  const linesDeleted = getEnvVar("LINES_DELETED", "0");

  // Get comparison data
  const filesChangedVsPrev = getEnvVar("FILES_CHANGED_VS_PREV", "0");
  const linesAddedVsPrev = getEnvVar("LINES_ADDED_VS_PREV", "0");
  const linesDeletedVsPrev = getEnvVar("LINES_DELETED_VS_PREV", "0");
  const isFirstCommit = getEnvVar("IS_FIRST_COMMIT", "false") === "true";

  // Get formatting data
  const formatNeeded = getEnvVar("FORMAT_NEEDED") === "true";
  const filesNeedingFormat = getEnvVar("FILES_NEEDING_FORMAT")?.split(",").filter(Boolean) || [];

  // Get linting data
  const lintPassed = getEnvVar("LINT_PASSED") === "true";
  const lintOutput = getEnvVar("LINT_OUTPUT", "");

  // Get bundle size data
  const bundleSizeMarkdown = getEnvVar("BUNDLE_SIZE_MARKDOWN", "_Not available_");

  const commitSha = getEnvVar("GITHUB_SHA", "unknown");

  // Determine overall status
  const allPassed = formattingResult === "success" && lintingResult === "success" && statsResult === "success";
  const statusEmoji = allPassed ? "✅" : "⚠️";
  const statusText = allPassed ? "All Checks Passed" : "Issues Found";

  // Build the comment
  let comment = `${COMMENT_IDENTIFIER}\n\n`;
  comment += `# ${statusEmoji} Code Hygiene Report: ${statusText}\n\n`;
  comment += `**Commit:** \`${formatCommitSha(commitSha ?? "unknown")}\`\n\n`;

  // Status Table
  comment += `## 📋 Check Summary\n\n`;
  comment += `| Check | Status | Result |\n`;
  comment += `|-------|--------|--------|\n`;
  comment += `| 📊 Statistics | ${getStatusEmoji(statsResult ?? "unknown")} | ${statsResult} |\n`;
  comment += `| 🎨 Formatting | ${getStatusEmoji(formattingResult ?? "unknown")} | ${formattingResult} |\n`;
  comment += `| 🔍 Linting | ${getStatusEmoji(lintingResult ?? "unknown")} | ${lintingResult} |\n\n`;

  // Code Changes Summary
  comment += `## 📊 Code Changes vs Main Branch\n\n`;
  comment += `**Files Changed:** ${filesChanged}  \n`;
  comment += `**Lines Added:** +${linesAdded}  \n`;
  comment += `**Lines Deleted:** -${linesDeleted}\n\n`;

  // Comparison with previous commit (if not first commit)
  if (!isFirstCommit) {
    comment += `<details>\n`;
    comment += `<summary>� Changes Since Previous Commit</summary>\n\n`;
    comment += `**Files Changed:** ${filesChangedVsPrev}  \n`;
    comment += `**Lines Added:** +${linesAddedVsPrev}  \n`;
    comment += `**Lines Deleted:** -${linesDeletedVsPrev}\n\n`;
    comment += `</details>\n\n`;
  }

  // Bundle Size Analysis
  if (bundleSizeMarkdown && bundleSizeMarkdown !== "_Not available_") {
    comment += `<details>\n`;
    comment += `<summary>📦 Bundle Size Analysis</summary>\n\n`;
    comment += `${bundleSizeMarkdown}\n\n`;
    comment += `</details>\n\n`;
  }

  // Formatting Results
  if (formatNeeded) {
    comment += `## 🎨 Formatting Issues\n\n`;
    comment += `❌ **${filesNeedingFormat.length}** file(s) need formatting:\n\n`;

    if (filesNeedingFormat.length > 0) {
      comment += `<details>\n`;
      comment += `<summary>View files requiring formatting</summary>\n\n`;
      filesNeedingFormat.forEach((file) => {
        comment += `- \`${file}\`\n`;
      });
      comment += `\n</details>\n\n`;
    }

    comment += `### How to Fix\n\n`;
    comment += `Run the following command locally:\n\n`;
    comment += `\`\`\`bash\n`;
    comment += `npm run format\n`;
    comment += `\`\`\`\n\n`;
  } else {
    comment += `## 🎨 Formatting\n\n`;
    comment += `✅ All files are properly formatted!\n\n`;
  }

  // Linting Results
  if (!lintPassed) {
    comment += `## 🔍 Linting Issues\n\n`;
    comment += `❌ ESLint found issues in your code.\n\n`;

    if (lintOutput) {
      const truncatedOutput = lintOutput.length > 50000 ? lintOutput.substring(0, 50000) + "\n\n... (output truncated)" : lintOutput;

      comment += `<details>\n`;
      comment += `<summary>View linting errors</summary>\n\n`;
      comment += `\`\`\`\n`;
      comment += `${truncatedOutput}\n`;
      comment += `\`\`\`\n\n`;
      comment += `</details>\n\n`;
    }

    comment += `### How to Fix\n\n`;
    comment += `Run the following command locally:\n\n`;
    comment += `\`\`\`bash\n`;
    comment += `npm run lint\n`;
    comment += `\`\`\`\n\n`;
  } else {
    comment += `## 🔍 Linting\n\n`;
    comment += `✅ All linting checks passed!\n\n`;
  }

  // Footer
  comment += `---\n\n`;
  comment += `_Last updated: ${new Date().toISOString()}_\n`;

  core.info("Generated unified hygiene comment");
  return comment;
}

/**
 * Posts or updates the unified hygiene comment on the PR
 * @param params - Script execution parameters
 */
export default async function postHygieneComment(params: ScriptParams): Promise<void> {
  const {github, context, core} = params;

  // Check if we're in a PR context
  const prNumber = getPRNumber(core);
  if (prNumber === null) {
    core.info("Not a PR context - skipping comment");
    return;
  }

  core.info(`📝 Posting unified hygiene comment to PR #${prNumber}`);

  const commentBody = generateUnifiedComment(params);

  try {
    // Try to find existing comment
    const existingCommentId = await findExistingComment(params, prNumber);

    if (existingCommentId) {
      // Update existing comment
      core.info(`Updating existing comment #${existingCommentId}`);
      await github.rest.issues.updateComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        comment_id: existingCommentId,
        body: commentBody,
      });
      core.info(`✅ Successfully updated comment #${existingCommentId}`);
    } else {
      // Create new comment
      core.info("Creating new hygiene comment");
      const {data: comment} = await github.rest.issues.createComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: prNumber,
        body: commentBody,
      });
      core.info(`✅ Successfully created comment #${comment.id}`);
    }

    core.notice(`PR hygiene comment: https://github.com/${context.repo.owner}/${context.repo.repo}/pull/${prNumber}`);
  } catch (error) {
    const err = error as Error;
    core.error(`❌ Failed to post/update hygiene comment: ${err.message}`);
    core.debug(`Stack trace: ${err.stack ?? "No stack trace available"}`);
    core.warning("Comment posting failed but continuing workflow execution");
  }
}
