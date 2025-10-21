/**
 * @fileoverview Status and formatting helper utilities
 * @module lib/status-helper
 */

import {STATUS_EMOJI} from "./constants.ts";

/**
 * Job status type as used in GitHub Actions
 */
export type JobStatus = "success" | "failure" | "cancelled" | "skipped" | "unknown";

/**
 * Maps a job status string to its corresponding emoji
 * @param status - Job status string from GitHub Actions
 * @returns Emoji representing the status (defaults to ❓ for unknown statuses)
 * @example
 * ```typescript
 * getStatusEmoji('success'); // Returns '✅'
 * getStatusEmoji('failure'); // Returns '❌'
 * getStatusEmoji('invalid'); // Returns '❓'
 * ```
 */
export function getStatusEmoji(status: string): string {
  const normalizedStatus = status.toLowerCase() as keyof typeof STATUS_EMOJI;
  return STATUS_EMOJI[normalizedStatus] ?? STATUS_EMOJI.unknown;
}

/**
 * Formats a Git commit SHA to its short form (first 7 characters)
 * @param commitSha - Full Git commit SHA (40 characters)
 * @returns Short commit SHA (7 characters), or original if shorter
 * @example
 * ```typescript
 * formatCommitSha('a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0');
 * // Returns 'a1b2c3d'
 * ```
 */
export function formatCommitSha(commitSha: string): string {
  if (!commitSha || commitSha.length < 7) {
    return commitSha || "unknown";
  }
  return commitSha.substring(0, 7);
}

/**
 * Formats a GitHub commit URL
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param commitSha - Commit SHA (will be formatted to short form)
 * @returns Full GitHub commit URL
 * @example
 * ```typescript
 * formatCommitUrl('arolariu', 'arolariu.ro', 'a1b2c3d...');
 * // Returns 'https://github.com/arolariu/arolariu.ro/commit/a1b2c3d...'
 * ```
 */
export function formatCommitUrl(owner: string, repo: string, commitSha: string): string {
  return `https://github.com/${owner}/${repo}/commit/${commitSha}`;
}

/**
 * Formats a GitHub pull request URL
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param prNumber - Pull request number
 * @returns Full GitHub PR URL
 * @example
 * ```typescript
 * formatPRUrl('arolariu', 'arolariu.ro', 123);
 * // Returns 'https://github.com/arolariu/arolariu.ro/pull/123'
 * ```
 */
export function formatPRUrl(owner: string, repo: string, prNumber: number): string {
  return `https://github.com/${owner}/${repo}/pull/${prNumber}`;
}

/**
 * Formats a GitHub workflow run URL
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param runId - Workflow run ID
 * @returns Full GitHub workflow run URL
 * @example
 * ```typescript
 * formatWorkflowUrl('arolariu', 'arolariu.ro', '12345');
 * // Returns 'https://github.com/arolariu/arolariu.ro/actions/runs/12345'
 * ```
 */
export function formatWorkflowUrl(owner: string, repo: string, runId: string): string {
  return `https://github.com/${owner}/${repo}/actions/runs/${runId}`;
}

/**
 * Capitalizes the first letter of a string
 * @param str - Input string
 * @returns String with first letter capitalized
 * @example
 * ```typescript
 * capitalizeFirst('success'); // Returns 'Success'
 * capitalizeFirst('FAILURE'); // Returns 'Failure'
 * ```
 */
export function capitalizeFirst(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Formats a status string with emoji prefix
 * @param status - Job status string
 * @returns Formatted string with emoji and capitalized status
 * @example
 * ```typescript
 * formatStatusWithEmoji('success'); // Returns '✅ Success'
 * formatStatusWithEmoji('failure'); // Returns '❌ Failure'
 * ```
 */
export function formatStatusWithEmoji(status: string): string {
  const emoji = getStatusEmoji(status);
  const capitalized = capitalizeFirst(status);
  return `${emoji} ${capitalized}`;
}

/**
 * Truncates text to a maximum length, adding ellipsis if needed
 * @param text - Text to truncate
 * @param maxLength - Maximum length (including ellipsis)
 * @returns Truncated text with ellipsis if needed
 * @example
 * ```typescript
 * truncateText('This is a very long text', 10);
 * // Returns 'This is...'
 * ```
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - 3) + "...";
}

/**
 * Formats a duration in seconds to human-readable format
 * @param seconds - Duration in seconds
 * @returns Formatted duration string (e.g., "2m 30s", "1h 15m")
 * @example
 * ```typescript
 * formatDuration(150); // Returns '2m 30s'
 * formatDuration(3665); // Returns '1h 1m 5s'
 * ```
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (remainingSeconds > 0) parts.push(`${remainingSeconds}s`);

  return parts.join(" ");
}

/**
 * Formats a file size in bytes to human-readable format
 * @param bytes - Size in bytes
 * @returns Formatted size string (e.g., "1.5 MB", "500 KB")
 * @example
 * ```typescript
 * formatFileSize(1500000); // Returns '1.43 MB'
 * formatFileSize(500); // Returns '500 B'
 * ```
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${units[i]}`;
}
