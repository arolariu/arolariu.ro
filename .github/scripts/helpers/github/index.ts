/**
 * @fileoverview GitHub API operations using @actions/github
 * @module helpers/github
 * 
 * Provides a clean, type-safe API for GitHub operations in GitHub Actions.
 * Uses @actions/github (Octokit) for GitHub REST and GraphQL APIs.
 * Follows Single Responsibility Principle by focusing on GitHub API operations.
 */

import * as github from "@actions/github";
import * as core from "@actions/core";

/**
 * Type alias for the Octokit client
 */
export type OctokitClient = ReturnType<typeof github.getOctokit>;

/**
 * GitHub repository information
 */
export interface RepositoryInfo {
  /** Repository owner (username or organization) */
  owner: string;
  /** Repository name */
  name: string;
  /** Full repository name in owner/name format */
  fullName: string;
}

/**
 * Pull request context information
 */
export interface PullRequestContext {
  /** PR number */
  number: number;
  /** PR title */
  title: string;
  /** PR URL */
  url: string;
  /** PR state (open, closed, merged) */
  state: string;
  /** Base branch (target) */
  base: string;
  /** Head branch (source) */
  head: string;
  /** PR author */
  author: string;
}

/**
 * Issue or PR comment
 */
export interface Comment {
  /** Comment ID */
  id: number;
  /** Comment body (markdown) */
  body: string;
  /** Comment author */
  author: string;
  /** Comment creation date */
  createdAt: string;
  /** Comment update date */
  updatedAt: string;
  /** Comment URL */
  url: string;
}

/**
 * GitHub issue information
 */
export interface IssueInfo {
  /** Issue number */
  number: number;
  /** Issue title */
  title: string;
  /** Issue body */
  body: string;
  /** Issue state (open, closed) */
  state: string;
  /** Issue URL */
  url: string;
  /** Issue labels */
  labels: string[];
  /** Issue assignees */
  assignees: string[];
}

/**
 * GitHub helper interface
 * Provides methods for GitHub API operations
 */
export interface IGitHubHelper {
  /**
   * Gets repository information from context
   * @returns Repository information
   */
  getRepository(): RepositoryInfo;

  /**
   * Gets pull request context if available
   * @returns PR context or null if not in PR context
   */
  getPullRequest(): PullRequestContext | null;

  /**
   * Posts a comment on a pull request
   * @param prNumber - PR number
   * @param body - Comment body (markdown)
   * @returns Promise resolving to created comment
   */
  postPullRequestComment(prNumber: number, body: string): Promise<Comment>;

  /**
   * Updates an existing comment
   * @param commentId - Comment ID to update
   * @param body - New comment body
   * @returns Promise resolving to updated comment
   */
  updateComment(commentId: number, body: string): Promise<Comment>;

  /**
   * Deletes a comment
   * @param commentId - Comment ID to delete
   * @returns Promise resolving when deletion completes
   */
  deleteComment(commentId: number): Promise<void>;

  /**
   * Lists comments on a pull request
   * @param prNumber - PR number
   * @returns Promise resolving to array of comments
   */
  listPullRequestComments(prNumber: number): Promise<Comment[]>;

  /**
   * Finds a comment by a search string in the body
   * @param prNumber - PR number
   * @param searchString - String to search for in comment body
   * @returns Promise resolving to found comment or null
   */
  findComment(prNumber: number, searchString: string): Promise<Comment | null>;

  /**
   * Creates or updates a comment (idempotent)
   * @param prNumber - PR number
   * @param body - Comment body
   * @param uniqueId - Unique identifier to find existing comment
   * @returns Promise resolving to comment (created or updated)
   */
  upsertComment(prNumber: number, body: string, uniqueId: string): Promise<Comment>;

  /**
   * Creates an issue
   * @param title - Issue title
   * @param body - Issue body
   * @param labels - Issue labels
   * @param assignees - Issue assignees
   * @returns Promise resolving to created issue
   */
  createIssue(title: string, body: string, labels?: string[], assignees?: string[]): Promise<IssueInfo>;

  /**
   * Updates an issue
   * @param issueNumber - Issue number
   * @param updates - Fields to update
   * @returns Promise resolving to updated issue
   */
  updateIssue(
    issueNumber: number,
    updates: {
      title?: string;
      body?: string;
      state?: "open" | "closed";
      labels?: string[];
      assignees?: string[];
    }
  ): Promise<IssueInfo>;

  /**
   * Gets issue information
   * @param issueNumber - Issue number
   * @returns Promise resolving to issue information
   */
  getIssue(issueNumber: number): Promise<IssueInfo>;

  /**
   * Lists issues
   * @param options - Filtering options
   * @returns Promise resolving to array of issues
   */
  listIssues(options?: {
    state?: "open" | "closed" | "all";
    labels?: string[];
    assignee?: string;
  }): Promise<IssueInfo[]>;

  /**
   * Adds labels to an issue or PR
   * @param issueNumber - Issue or PR number
   * @param labels - Labels to add
   * @returns Promise resolving when labels are added
   */
  addLabels(issueNumber: number, labels: string[]): Promise<void>;

  /**
   * Removes labels from an issue or PR
   * @param issueNumber - Issue or PR number
   * @param labels - Labels to remove
   * @returns Promise resolving when labels are removed
   */
  removeLabels(issueNumber: number, labels: string[]): Promise<void>;

  /**
   * Gets the Octokit client instance
   * @returns Octokit client
   */
  getClient(): OctokitClient;
}

/**
 * Implementation of GitHub helper
 */
export class GitHubHelper implements IGitHubHelper {
  private client: OctokitClient;
  private context: typeof github.context;
  private repo: RepositoryInfo;

  /**
   * Creates a new GitHub helper instance
   * @param token - GitHub token for authentication
   * @param context - GitHub Actions context (optional, uses github.context by default)
   */
  constructor(token: string, context?: typeof github.context) {
    this.client = github.getOctokit(token);
    this.context = context ?? github.context;
    
    const { owner, repo } = this.context.repo;
    this.repo = {
      owner,
      name: repo,
      fullName: `${owner}/${repo}`,
    };
  }

  /**
   * {@inheritDoc IGitHubHelper.getRepository}
   */
  getRepository(): RepositoryInfo {
    return this.repo;
  }

  /**
   * {@inheritDoc IGitHubHelper.getPullRequest}
   */
  getPullRequest(): PullRequestContext | null {
    const pr = this.context.payload.pull_request;
    
    if (!pr) {
      return null;
    }

    return {
      number: pr.number,
      title: pr.title,
      url: pr.html_url,
      state: pr.state,
      base: pr.base.ref,
      head: pr.head.ref,
      author: pr.user.login,
    };
  }

  /**
   * {@inheritDoc IGitHubHelper.postPullRequestComment}
   */
  async postPullRequestComment(prNumber: number, body: string): Promise<Comment> {
    try {
      core.info(`💬 Posting comment to PR #${prNumber}`);
      core.debug(`Comment length: ${body.length} characters`);

      const response = await this.client.rest.issues.createComment({
        owner: this.repo.owner,
        repo: this.repo.name,
        issue_number: prNumber,
        body,
      });

      core.info(`✅ Successfully posted comment to PR #${prNumber}`);
      core.notice(`PR comment: https://github.com/${this.repo.fullName}/pull/${prNumber}`);

      return {
        id: response.data.id,
        body: response.data.body ?? "",
        author: response.data.user?.login ?? "unknown",
        createdAt: response.data.created_at,
        updatedAt: response.data.updated_at,
        url: response.data.html_url,
      };
    } catch (error) {
      const err = error as Error;
      core.error(`❌ Failed to post comment to PR #${prNumber}: ${err.message}`);
      throw new Error(`Failed to post PR comment: ${err.message}`);
    }
  }

  /**
   * {@inheritDoc IGitHubHelper.updateComment}
   */
  async updateComment(commentId: number, body: string): Promise<Comment> {
    try {
      core.debug(`Updating comment ${commentId}`);

      const response = await this.client.rest.issues.updateComment({
        owner: this.repo.owner,
        repo: this.repo.name,
        comment_id: commentId,
        body,
      });

      core.debug(`✅ Comment ${commentId} updated`);

      return {
        id: response.data.id,
        body: response.data.body ?? "",
        author: response.data.user?.login ?? "unknown",
        createdAt: response.data.created_at,
        updatedAt: response.data.updated_at,
        url: response.data.html_url,
      };
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to update comment ${commentId}: ${err.message}`);
    }
  }

  /**
   * {@inheritDoc IGitHubHelper.deleteComment}
   */
  async deleteComment(commentId: number): Promise<void> {
    try {
      core.debug(`Deleting comment ${commentId}`);

      await this.client.rest.issues.deleteComment({
        owner: this.repo.owner,
        repo: this.repo.name,
        comment_id: commentId,
      });

      core.debug(`✅ Comment ${commentId} deleted`);
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to delete comment ${commentId}: ${err.message}`);
    }
  }

  /**
   * {@inheritDoc IGitHubHelper.listPullRequestComments}
   */
  async listPullRequestComments(prNumber: number): Promise<Comment[]> {
    try {
      core.debug(`Listing comments for PR #${prNumber}`);

      const response = await this.client.rest.issues.listComments({
        owner: this.repo.owner,
        repo: this.repo.name,
        issue_number: prNumber,
      });

      return response.data.map((comment) => ({
        id: comment.id,
        body: comment.body ?? "",
        author: comment.user?.login ?? "unknown",
        createdAt: comment.created_at,
        updatedAt: comment.updated_at,
        url: comment.html_url,
      }));
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to list PR comments: ${err.message}`);
    }
  }

  /**
   * {@inheritDoc IGitHubHelper.findComment}
   */
  async findComment(prNumber: number, searchString: string): Promise<Comment | null> {
    const comments = await this.listPullRequestComments(prNumber);
    
    const found = comments.find((comment) => comment.body.includes(searchString));
    
    return found ?? null;
  }

  /**
   * {@inheritDoc IGitHubHelper.upsertComment}
   */
  async upsertComment(prNumber: number, body: string, uniqueId: string): Promise<Comment> {
    const existingComment = await this.findComment(prNumber, uniqueId);

    if (existingComment) {
      core.info(`Updating existing comment ${existingComment.id}`);
      return this.updateComment(existingComment.id, body);
    }

    core.info("Creating new comment");
    return this.postPullRequestComment(prNumber, body);
  }

  /**
   * {@inheritDoc IGitHubHelper.createIssue}
   */
  async createIssue(title: string, body: string, labels?: string[], assignees?: string[]): Promise<IssueInfo> {
    try {
      core.info(`Creating issue: ${title}`);

      const response = await this.client.rest.issues.create({
        owner: this.repo.owner,
        repo: this.repo.name,
        title,
        body,
        labels,
        assignees,
      });

      core.info(`✅ Issue created: #${response.data.number}`);

      return {
        number: response.data.number,
        title: response.data.title,
        body: response.data.body ?? "",
        state: response.data.state,
        url: response.data.html_url,
        labels: response.data.labels.map((label) => (typeof label === "string" ? label : label.name ?? "")),
        assignees: response.data.assignees?.map((assignee) => assignee.login) ?? [],
      };
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to create issue: ${err.message}`);
    }
  }

  /**
   * {@inheritDoc IGitHubHelper.updateIssue}
   */
  async updateIssue(
    issueNumber: number,
    updates: {
      title?: string;
      body?: string;
      state?: "open" | "closed";
      labels?: string[];
      assignees?: string[];
    }
  ): Promise<IssueInfo> {
    try {
      core.info(`Updating issue #${issueNumber}`);

      const response = await this.client.rest.issues.update({
        owner: this.repo.owner,
        repo: this.repo.name,
        issue_number: issueNumber,
        ...updates,
      });

      return {
        number: response.data.number,
        title: response.data.title,
        body: response.data.body ?? "",
        state: response.data.state,
        url: response.data.html_url,
        labels: response.data.labels.map((label) => (typeof label === "string" ? label : label.name ?? "")),
        assignees: response.data.assignees?.map((assignee) => assignee.login) ?? [],
      };
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to update issue: ${err.message}`);
    }
  }

  /**
   * {@inheritDoc IGitHubHelper.getIssue}
   */
  async getIssue(issueNumber: number): Promise<IssueInfo> {
    try {
      const response = await this.client.rest.issues.get({
        owner: this.repo.owner,
        repo: this.repo.name,
        issue_number: issueNumber,
      });

      return {
        number: response.data.number,
        title: response.data.title,
        body: response.data.body ?? "",
        state: response.data.state,
        url: response.data.html_url,
        labels: response.data.labels.map((label) => (typeof label === "string" ? label : label.name ?? "")),
        assignees: response.data.assignees?.map((assignee) => assignee.login) ?? [],
      };
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to get issue: ${err.message}`);
    }
  }

  /**
   * {@inheritDoc IGitHubHelper.listIssues}
   */
  async listIssues(options: {
    state?: "open" | "closed" | "all";
    labels?: string[];
    assignee?: string;
  } = {}): Promise<IssueInfo[]> {
    try {
      const response = await this.client.rest.issues.listForRepo({
        owner: this.repo.owner,
        repo: this.repo.name,
        state: options.state ?? "open",
        labels: options.labels?.join(","),
        assignee: options.assignee,
      });

      return response.data.map((issue) => ({
        number: issue.number,
        title: issue.title,
        body: issue.body ?? "",
        state: issue.state,
        url: issue.html_url,
        labels: issue.labels.map((label) => (typeof label === "string" ? label : label.name ?? "")),
        assignees: issue.assignees?.map((assignee) => assignee.login) ?? [],
      }));
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to list issues: ${err.message}`);
    }
  }

  /**
   * {@inheritDoc IGitHubHelper.addLabels}
   */
  async addLabels(issueNumber: number, labels: string[]): Promise<void> {
    try {
      await this.client.rest.issues.addLabels({
        owner: this.repo.owner,
        repo: this.repo.name,
        issue_number: issueNumber,
        labels,
      });

      core.debug(`Added labels to #${issueNumber}: ${labels.join(", ")}`);
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to add labels: ${err.message}`);
    }
  }

  /**
   * {@inheritDoc IGitHubHelper.removeLabels}
   */
  async removeLabels(issueNumber: number, labels: string[]): Promise<void> {
    try {
      for (const label of labels) {
        await this.client.rest.issues.removeLabel({
          owner: this.repo.owner,
          repo: this.repo.name,
          issue_number: issueNumber,
          name: label,
        });
      }

      core.debug(`Removed labels from #${issueNumber}: ${labels.join(", ")}`);
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to remove labels: ${err.message}`);
    }
  }

  /**
   * {@inheritDoc IGitHubHelper.getClient}
   */
  getClient(): OctokitClient {
    return this.client;
  }
}

/**
 * Creates a new GitHub helper instance
 * @param token - GitHub token for authentication
 * @param context - Optional GitHub Actions context
 * @returns GitHub helper instance
 * @example
 * ```typescript
 * const gh = createGitHubHelper(process.env.GITHUB_TOKEN!);
 * const pr = gh.getPullRequest();
 * if (pr) {
 *   await gh.postPullRequestComment(pr.number, '## Build Results\n\n✅ Success');
 * }
 * ```
 */
export function createGitHubHelper(token: string, context?: typeof github.context): IGitHubHelper {
  return new GitHubHelper(token, context);
}
