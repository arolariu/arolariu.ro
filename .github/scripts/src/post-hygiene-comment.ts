/**
 * @fileoverview Posts a unified comprehensive code hygiene check result as a single PR comment
 * @module src/post-hygiene-comment
 */

import * as core from "@actions/core";
import {createCommentBuilder, createGitHubHelper, env} from "../helpers/index.ts";

/**
 * Unique identifier for the hygiene check comment
 */
const COMMENT_IDENTIFIER = "arolariu-hygiene-check-comment";

/**
 * Formats a commit SHA to short form
 */
function formatCommitSha(sha: string): string {
  return sha.substring(0, 7);
}

/**
 * Gets status emoji for result
 */
function getStatusEmoji(status: string): string {
  switch (status) {
    case "success":
      return "✅";
    case "failure":
      return "❌";
    case "warning":
      return "⚠️";
    default:
      return "❓";
  }
}

/**
 * Generates the unified comprehensive hygiene comment
 * @returns Markdown string for the complete hygiene check report
 */
function generateUnifiedComment(): string {
  // Core status information
  const statsResult = env.get("STATS_RESULT", "unknown") ?? "unknown";
  const formattingResult = env.get("FORMATTING_RESULT", "unknown") ?? "unknown";
  const lintingResult = env.get("LINTING_RESULT", "unknown") ?? "unknown";

  // Primary diff stats
  const filesChanged = env.get("FILES_CHANGED", "0") ?? "0";
  const linesAdded = env.get("LINES_ADDED", "0") ?? "0";
  const linesDeleted = env.get("LINES_DELETED", "0") ?? "0";

  // Previous commit comparison
  const filesChangedVsPrev = env.get("FILES_CHANGED_VS_PREV", "0") ?? "0";
  const linesAddedVsPrev = env.get("LINES_ADDED_VS_PREV", "0") ?? "0";
  const linesDeletedVsPrev = env.get("LINES_DELETED_VS_PREV", "0") ?? "0";
  const isFirstCommit = env.getBoolean("IS_FIRST_COMMIT", false);

  // Formatting
  const formatNeeded = env.getBoolean("FORMAT_NEEDED", false);
  const filesNeedingFormat = env.get("FILES_NEEDING_FORMAT")?.split(",").filter(Boolean) || [];

  // Linting
  const lintPassed = env.getBoolean("LINT_PASSED", false);
  const lintOutput = env.get("LINT_OUTPUT", "") ?? "";

  // Bundle size
  const bundleSizeMarkdown = env.get("BUNDLE_SIZE_MARKDOWN", "_Not available_") ?? "_Not available_";

  // Extended metrics
  const topExtensionsTable = env.get("TOP_EXTENSION_TABLE");
  const topDirectoriesTable = env.get("TOP_DIRECTORY_TABLE");
  const churn = env.get("CHURN");
  const netChange = env.get("NET_CHANGE");

  const commitSha = env.get("GITHUB_SHA", "unknown") ?? "unknown";

  // Overall status calculation (stats considered informational; still included)
  const allPassed = formattingResult === "success" && lintingResult === "success" && statsResult === "success";

  const statusEmoji = allPassed ? "✅" : "⚠️";
  const statusText = allPassed ? "All Checks Passed" : "Issues Found";

  // Use comment builder for cleaner generation
  const builder = createCommentBuilder();

  builder
    .addHeading(`${statusEmoji} Code Hygiene Report: ${statusText}`, 1)
    .addParagraph(`**Commit:** \`${formatCommitSha(commitSha)}\``)
    .addNewline();

  // Summary matrix
  builder
    .addHeading("📋 Check Summary", 2)
    .addTable(
      [
        {header: "Check", align: "left"},
        {header: "Status", align: "center"},
        {header: "Result", align: "left"},
      ],
      [
        [`📊 Statistics`, getStatusEmoji(statsResult), statsResult],
        [`🎨 Formatting`, getStatusEmoji(formattingResult), formattingResult],
        [`🔍 Linting`, getStatusEmoji(lintingResult), lintingResult],
      ],
    )
    .addNewline();

  // Diff summary vs base
  let comment = builder.build();
  comment += `## 📊 Code Changes vs Main Branch\n\n`;
  comment += `**Files Changed:** ${filesChanged}  \n`;
  comment += `**Lines Added:** +${linesAdded}  \n`;
  comment += `**Lines Deleted:** -${linesDeleted}\n\n`;

  // Extended change metrics
  if (churn !== undefined || netChange !== undefined) {
    comment += `### 🔢 Change Metrics\n\n`;
    if (churn !== undefined) {
      comment += `- **Churn (Added + Deleted):** ${churn}\n`;
    }
    if (netChange !== undefined) {
      const netNum = Number(netChange);
      const netSign = netNum > 0 ? "+" : "";
      comment += `- **Net Change (Added - Deleted):** ${netSign}${netChange}\n`;
    }
    comment += `\n`;
  }

  // Previous commit comparison
  if (!isFirstCommit) {
    comment += `<details>\n`;
    comment += `<summary>🔄 Changes Since Previous Commit</summary>\n\n`;
    comment += `**Files Changed:** ${filesChangedVsPrev}  \n`;
    comment += `**Lines Added:** +${linesAddedVsPrev}  \n`;
    comment += `**Lines Deleted:** -${linesDeletedVsPrev}\n\n`;
    comment += `</details>\n\n`;
  }

  // Extension distribution
  if (topExtensionsTable && topExtensionsTable.includes("|")) {
    comment += `<details>\n`;
    comment += `<summary>🧩 Extension Distribution (Top)</summary>\n\n`;
    comment += `${topExtensionsTable}\n\n`;
    comment += `</details>\n\n`;
  }

  // Directory impact
  if (topDirectoriesTable && topDirectoriesTable.includes("|")) {
    comment += `<details>\n`;
    comment += `<summary>📂 Directory Impact (Top)</summary>\n\n`;
    comment += `${topDirectoriesTable}\n\n`;
    comment += `</details>\n\n`;
  }

  // Bundle Size
  if (bundleSizeMarkdown && bundleSizeMarkdown !== "_Not available_") {
    comment += `<details>\n`;
    comment += `<summary>📦 Bundle Size Analysis</summary>\n\n`;
    comment += `${bundleSizeMarkdown}\n\n`;
    comment += `</details>\n\n`;
  }

  // Formatting
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
    comment += `\`\`\`bash\nnpm run format\n\`\`\`\n\n`;
  } else {
    comment += `## 🎨 Formatting\n\n`;
    comment += `✅ All files are properly formatted!\n\n`;
  }

  // Linting
  if (!lintPassed) {
    comment += `## 🔍 Linting Issues\n\n`;
    comment += `❌ ESLint found issues in your code.\n\n`;
    if (lintOutput) {
      const truncatedOutput = lintOutput.length > 50000 ? lintOutput.substring(0, 50000) + "\n\n... (output truncated)" : lintOutput;
      comment += `<details>\n`;
      comment += `<summary>View linting errors</summary>\n\n`;
      comment += `\`\`\`\n${truncatedOutput}\n\`\`\`\n\n`;
      comment += `</details>\n\n`;
    }
    comment += `### How to Fix\n\n`;
    comment += `\`\`\`bash\nnpm run lint\n\`\`\`\n\n`;
  } else {
    comment += `## 🔍 Linting\n\n`;
    comment += `✅ All linting checks passed!\n\n`;
  }

  // Footer
  comment += `---\n\n`;
  comment += `_Last updated: ${new Date().toISOString()}_\n`;

  // Add hidden identifier
  comment += `\n<!-- ${COMMENT_IDENTIFIER} -->\n`;

  core.info("Generated unified hygiene comment (extended version)");
  return comment;
}

/**
 * Posts or updates the unified hygiene comment on the PR
 *
 * @refactored Uses new GitHub helper with upsert pattern
 */
export default async function postHygieneComment(): Promise<void> {
  try {
    // Get GitHub token and create helper
    const token = env.getRequired("GITHUB_TOKEN");
    const gh = createGitHubHelper(token);

    // Check if we're in a PR context
    const pr = gh.getPullRequest();
    if (!pr) {
      core.info("Not a PR context - skipping comment");
      return;
    }

    core.info(`📝 Posting unified hygiene comment to PR #${pr.number}`);

    // Generate comment body
    const commentBody = generateUnifiedComment();

    // Use upsert to create or update comment
    await gh.upsertComment(pr.number, commentBody, COMMENT_IDENTIFIER);

    core.info(`✅ Successfully posted hygiene comment`);
    core.notice(`PR hygiene comment: ${pr.url}`);
  } catch (error) {
    const err = error as Error;
    core.error(`❌ Failed to post/update hygiene comment: ${err.message}`);
    core.debug(`Stack trace: ${err.stack ?? "No stack trace available"}`);
    core.warning("Comment posting failed but continuing workflow execution");
  }
}
