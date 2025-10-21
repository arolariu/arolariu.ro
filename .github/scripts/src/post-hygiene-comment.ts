/**
 * @fileoverview Posts code hygiene check results as PR comments
 * @module src/post-hygiene-comment
 */

import {getEnvVar} from "../lib/env-helper.ts";
import {getPRNumber, postPRComment} from "../lib/pr-helper.ts";
import {formatCommitSha, getStatusEmoji} from "../lib/status-helper.ts";
import type {ScriptParams} from "../types/index.ts";

/**
 * Generates markdown comment for statistics results
 * @param params - Script parameters
 * @returns Markdown string
 */
function generateStatsComment(params: ScriptParams): string {
  const {core} = params;

  const filesChanged = getEnvVar("FILES_CHANGED", "0");
  const linesAdded = getEnvVar("LINES_ADDED", "0");
  const linesDeleted = getEnvVar("LINES_DELETED", "0");
  const bundleSizeMarkdown = getEnvVar("BUNDLE_SIZE_MARKDOWN", "_Not available_");
  const commitSha = getEnvVar("GITHUB_SHA", "unknown");

  const comment = `## 📊 Code Statistics

**Files Changed:** ${filesChanged}
**Lines Added:** +${linesAdded}
**Lines Deleted:** -${linesDeleted}

${bundleSizeMarkdown}

_Stats computed for commit \`${formatCommitSha(commitSha ?? "unknown")}\`_`;

  core.info("Generated statistics comment");
  return comment;
}

/**
 * Generates markdown comment for formatting check results
 * @param params - Script parameters
 * @returns Markdown string
 */
function generateFormattingComment(params: ScriptParams): string {
  const {core} = params;

  const formatNeeded = getEnvVar("FORMAT_NEEDED") === "true";
  const filesNeedingFormat = getEnvVar("FILES_NEEDING_FORMAT")?.split(",").filter(Boolean) || [];
  const commitSha = getEnvVar("GITHUB_SHA", "unknown");

  if (!formatNeeded) {
    return `## 🎨 Code Formatting

✅ All files are properly formatted!

_Check passed for commit \`${formatCommitSha(commitSha ?? "unknown")}\`_`;
  }

  const filesList = filesNeedingFormat.length > 0 ? filesNeedingFormat.map((f) => `- \`${f}\``).join("\n") : "_Files list not available_";

  const comment = `## 🎨 Formatting Issues Detected

⚠️ **${filesNeedingFormat.length}** file(s) need formatting:

${filesList}

### How to Fix

Run the following command locally:

\`\`\`bash
npm run format
\`\`\`

Then commit and push the changes.

_Check failed for commit \`${formatCommitSha(commitSha ?? "unknown")}\`_`;

  core.info("Generated formatting issues comment");
  return comment;
}

/**
 * Generates markdown comment for linting check results
 * @param params - Script parameters
 * @returns Markdown string
 */
function generateLintingComment(params: ScriptParams): string {
  const {core} = params;

  const lintPassed = getEnvVar("LINT_PASSED") === "true";
  const lintOutput = getEnvVar("LINT_OUTPUT", "_No output captured_");
  const commitSha = getEnvVar("GITHUB_SHA", "unknown");

  if (lintPassed) {
    return `## 🔍 Code Linting

✅ All linting checks passed!

_Check passed for commit \`${formatCommitSha(commitSha ?? "unknown")}\`_`;
  }

  // Truncate output if too long for GitHub comment
  const truncatedOutput =
    (lintOutput?.length ?? 0) > 50000 ? (lintOutput?.substring(0, 50000) ?? "") + "\n\n... (output truncated)" : lintOutput;

  const comment = `## 🔍 Linting Issues Detected

❌ ESLint found issues in your code. Please fix them before merging.

<details>
<summary>Click to see linting errors</summary>

\`\`\`
${truncatedOutput}
\`\`\`

</details>

### How to Fix

Run the following command locally to see and fix issues:

\`\`\`bash
npm run lint
\`\`\`

Some issues may be auto-fixable. Review the output carefully.

_Check failed for commit \`${formatCommitSha(commitSha ?? "unknown")}\`_`;

  core.info("Generated linting issues comment");
  return comment;
}

/**
 * Generates comprehensive summary comment for all hygiene checks
 * @param params - Script parameters
 * @returns Markdown string
 */
function generateSummaryComment(params: ScriptParams): string {
  const {core} = params;

  const statsResult = getEnvVar("STATS_RESULT", "unknown");
  const formattingResult = getEnvVar("FORMATTING_RESULT", "unknown");
  const lintingResult = getEnvVar("LINTING_RESULT", "unknown");

  const filesChanged = getEnvVar("FILES_CHANGED", "0");
  const linesAdded = getEnvVar("LINES_ADDED", "0");
  const linesDeleted = getEnvVar("LINES_DELETED", "0");
  const commitSha = getEnvVar("GITHUB_SHA", "unknown");

  const comment = `## 🧹 Code Hygiene Summary

| Check | Status |
|-------|--------|
| 📊 Statistics | ${getStatusEmoji(statsResult ?? "unknown")} ${statsResult} |
| 🎨 Formatting | ${getStatusEmoji(formattingResult ?? "unknown")} ${formattingResult} |
| 🔍 Linting | ${getStatusEmoji(lintingResult ?? "unknown")} ${lintingResult} |

---

**Files Changed:** ${filesChanged}
**Lines Added:** +${linesAdded}
**Lines Deleted:** -${linesDeleted}

_Workflow completed for commit \`${formatCommitSha(commitSha ?? "unknown")}\`_`;

  core.info("Generated summary comment");
  return comment;
}

/**
 * Posts a comment to the PR based on comment type
 * @param params - Script execution parameters
 */
export default async function postHygieneComment(params: ScriptParams): Promise<void> {
  const {core} = params;

  // Check if we're in a PR context
  const prNumber = getPRNumber(core);
  if (prNumber === null) {
    core.info("Not a PR context - skipping comment");
    return;
  }

  // Determine comment type
  const commentType = getEnvVar("COMMENT_TYPE", "summary");

  core.info(`📝 Posting ${commentType} comment to PR #${prNumber}`);

  let commentBody: string;

  switch (commentType) {
    case "stats": {
      commentBody = generateStatsComment(params);
      break;
    }
    case "formatting": {
      commentBody = generateFormattingComment(params);
      break;
    }
    case "linting": {
      commentBody = generateLintingComment(params);
      break;
    }
    case "summary": {
      commentBody = generateSummaryComment(params);
      break;
    }
    default: {
      core.setFailed(`Unknown comment type: ${commentType}`);
      return;
    }
  }

  // Post comment using reusable helper
  await postPRComment(params, prNumber, commentBody);
}
