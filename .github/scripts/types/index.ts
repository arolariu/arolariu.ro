/**
 * @fileoverview Core type definitions for GitHub Actions scripts
 * @module types
 */

/**
 * Interface for workflow information
 */
export interface WorkflowInfo {
  readonly prNumber: number;
  readonly prUrl: string;
  readonly runId: string;
  readonly workflowRunUrl: string;
  readonly shortCurrentCommitSha: string;
  readonly commitUrl: string;
  readonly branchName: string;
  readonly jobStatus: string;
}
