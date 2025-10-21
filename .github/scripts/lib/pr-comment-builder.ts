/**
 * @fileoverview PR comment generation utilities for GitHub pull requests
 * @module lib/pr-comment-builder
 */

import type {WorkflowInfo} from "../types/index.ts";
import {STATUS_EMOJI} from "./constants.ts";

/**
 * Generates the workflow information section header for a PR comment
 * @param workflowInfo - Object containing PR details, commit info, branch, and job status
 * @returns Markdown string with status emoji, commit link, PR link, and workflow run link
 * @example
 * ```typescript
 * const section = generateWorkflowInfoSection({
 *   prNumber: 123,
 *   prUrl: 'https://github.com/owner/repo/pull/123',
 *   runId: '9876',
 *   workflowRunUrl: 'https://github.com/owner/repo/actions/runs/9876',
 *   shortCurrentCommitSha: 'a1b2c3d',
 *   commitUrl: 'https://github.com/owner/repo/commit/a1b2c3d',
 *   branchName: 'feature/new-feature',
 *   jobStatus: 'success'
 * });
 * // Returns: ## ✅ Tests Success for [`a1b2c3d`](url)...
 * ```
 */
export function generateWorkflowInfoSection({
  prNumber,
  prUrl,
  runId,
  workflowRunUrl,
  shortCurrentCommitSha,
  commitUrl,
  branchName,
  jobStatus,
}: WorkflowInfo): string {
  const statusEmoji = STATUS_EMOJI[jobStatus as keyof typeof STATUS_EMOJI] ?? STATUS_EMOJI.unknown;
  const statusText = jobStatus.charAt(0).toUpperCase() + jobStatus.slice(1);

  let section = `## ${statusEmoji} Tests ${statusText} for [\`${shortCurrentCommitSha}\`](${commitUrl})\n\n`;
  section += `**PR:** [#${prNumber}](${prUrl}) | **Branch:** \`${branchName}\` | **Workflow:** [#${runId} Action](${workflowRunUrl})\n\n`;
  section += `----\n`;
  return section;
}
