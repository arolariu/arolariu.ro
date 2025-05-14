import * as core from "@actions/core";
import * as github from "@actions/github";
import * as exec from "@actions/exec";

// Type alias for the Octokit client instance
export type OctokitClient = ReturnType<typeof github.getOctokit>;

/**
 * Interface for script parameters
 */
export interface ScriptParams {
  github: OctokitClient;
  context: typeof github.context;
  core: typeof core;
  exec: typeof exec;
}

/**
 * Interface for workflow information
 */
export interface WorkflowInfo {
  prNumber: number;
  prUrl: string;
  runId: string;
  workflowRunUrl: string;
  shortCurrentCommitSha: string;
  commitUrl: string;
  branchName: string;
  jobStatus: string;
}

/**
 * Interface for file comparison item
 */
export interface FileComparisonItem {
  path: string;
  mainSize?: number;
  previewSize?: number;
  diff: number;
  status: string;
}
