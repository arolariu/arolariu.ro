/**
 * @fileoverview GitHub API operations using @actions/github.
 * @module github/scripts/helpers/github
 *
 * @remarks
 * Provides a clean, type-safe API for GitHub operations in GitHub Actions.
 * Uses @actions/github (Octokit) for GitHub REST and GraphQL APIs.
 * SDK errors propagate unchanged. List operations use native pagination; marker
 * matching remains substring-based without an additional author policy.
 */

import * as core from "../sdk/core.ts";
import * as github from "../sdk/github.ts";

/**
 * Type alias for the Octokit client
 */
export type OctokitClient = ReturnType<typeof github.getOctokit>;

/** Inject a fully configured native client, including plugins/request options. */
export interface GitHubHelperOptions {
  readonly client?: OctokitClient;
}

type NativeComment = Awaited<ReturnType<OctokitClient["rest"]["issues"]["createComment"]>>["data"];
type NativeIssue = Pick<
  Awaited<ReturnType<OctokitClient["rest"]["issues"]["get"]>>["data"],
  "number" | "title" | "body" | "state" | "html_url" | "labels" | "assignees"
>;

/**
 * GitHub repository information
 */
export interface RepositoryInfo {
  /** Repository owner (username or organization) */
  readonly owner: string;
  /** Repository name */
  readonly name: string;
  /** Full repository name in owner/name format */
  readonly fullName: string;
}

/**
 * Pull request context information
 */
export interface PullRequestContext {
  /** PR number */
  readonly number: number;
  /** PR title */
  readonly title: string;
  /** PR URL */
  readonly url: string;
  /** PR state (open, closed, merged) */
  readonly state: string;
  /** Base branch (target) */
  readonly base: string;
  /** Head branch (source) */
  readonly head: string;
  /** PR author */
  readonly author: string;
}

/**
 * Issue or PR comment
 */
export interface Comment {
  /** Comment ID */
  readonly id: number;
  /** Comment body (markdown) */
  readonly body: string;
  /** Comment author */
  readonly author: string;
  /** Comment creation date */
  readonly createdAt: string;
  /** Comment update date */
  readonly updatedAt: string;
  /** Comment URL */
  readonly url: string;
}

/**
 * GitHub issue information
 */
export interface IssueInfo {
  /** Issue number */
  readonly number: number;
  /** Issue title */
  readonly title: string;
  /** Issue body */
  readonly body: string;
  /** Issue state (open, closed) */
  readonly state: string;
  /** Issue URL */
  readonly url: string;
  /** Issue labels */
  readonly labels: readonly string[];
  /** Issue assignees */
  readonly assignees: readonly string[];
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
   * Lists every page of comments on a pull request.
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
    },
  ): Promise<IssueInfo>;

  /**
   * Gets issue information
   * @param issueNumber - Issue number
   * @returns Promise resolving to issue information
   */
  getIssue(issueNumber: number): Promise<IssueInfo>;

  /**
   * Lists every page of issues matching the existing repository filters.
   * @param options - Filtering options
   * @returns Promise resolving to array of issues
   */
  listIssues(options?: {state?: "open" | "closed" | "all"; labels?: string[]; assignee?: string}): Promise<IssueInfo[]>;

  /**
   * Finds an open pull request for a given branch name
   * Useful when triggered by push events where PR context is not available
   * @param branchName - The head branch name to search for
   * @returns PR context or null only for a successful empty lookup.
   * @throws Original SDK/transport errors unchanged.
   */
  findPullRequestForBranch(branchName: string): Promise<PullRequestContext | null>;

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
  private readonly client: OctokitClient;
  private readonly context: typeof github.context;
  private readonly repo: RepositoryInfo;

  /**
   * Creates a new GitHub helper instance
   * @param token - GitHub token for authentication
   * @param context - GitHub Actions context (optional, uses github.context by default)
   * @param options - Optional complete native client injection.
   */
  constructor(token: string, context?: typeof github.context, options: GitHubHelperOptions = {}) {
    this.client = options.client ?? github.getOctokit(token);
    this.context = context ?? github.context;

    const {owner, repo} = this.context.repo;
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
      title: pr["title"],
      url: pr["html_url"] ?? "",
      state: pr["state"],
      base: pr["base"].ref,
      head: pr["head"].ref,
      author: pr["user"]?.login ?? "",
    };
  }

  /**
   * {@inheritDoc IGitHubHelper.findPullRequestForBranch}
   */
  async findPullRequestForBranch(branchName: string): Promise<PullRequestContext | null> {
    const response = await this.client.rest.pulls.list({
      owner: this.repo.owner,
      repo: this.repo.name,
      state: "open",
      head: `${this.repo.owner}:${branchName}`,
      per_page: 1,
    });
    const pr = response.data[0];
    if (!pr) return null;
    return {
      number: pr.number,
      title: pr.title,
      url: pr.html_url,
      state: pr.state,
      base: pr.base.ref,
      head: pr.head.ref,
      author: pr.user?.login ?? "",
    };
  }

  /**
   * {@inheritDoc IGitHubHelper.postPullRequestComment}
   */
  async postPullRequestComment(prNumber: number, body: string): Promise<Comment> {
    const response = await this.client.rest.issues.createComment({
      owner: this.repo.owner,
      repo: this.repo.name,
      issue_number: prNumber,
      body,
    });
    core.notice(`PR comment: https://github.com/${this.repo.fullName}/pull/${prNumber}`);
    return this.comment(response.data);
  }

  /**
   * {@inheritDoc IGitHubHelper.updateComment}
   */
  async updateComment(commentId: number, body: string): Promise<Comment> {
    return this.comment(
      (await this.client.rest.issues.updateComment({owner: this.repo.owner, repo: this.repo.name, comment_id: commentId, body})).data,
    );
  }

  /**
   * {@inheritDoc IGitHubHelper.deleteComment}
   */
  async deleteComment(commentId: number): Promise<void> {
    await this.client.rest.issues.deleteComment({owner: this.repo.owner, repo: this.repo.name, comment_id: commentId});
  }

  /**
   * {@inheritDoc IGitHubHelper.listPullRequestComments}
   */
  async listPullRequestComments(prNumber: number): Promise<Comment[]> {
    const comments = await this.client.paginate(this.client.rest.issues.listComments, {
      owner: this.repo.owner,
      repo: this.repo.name,
      issue_number: prNumber,
      per_page: 100,
    });
    return comments.map((comment) => this.comment(comment));
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
    const response = await this.client.rest.issues.create({
      owner: this.repo.owner,
      repo: this.repo.name,
      title,
      body,
      ...(labels ? {labels} : {}),
      ...(assignees ? {assignees} : {}),
    });
    return this.issue(response.data);
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
    },
  ): Promise<IssueInfo> {
    const response = await this.client.rest.issues.update({
      owner: this.repo.owner,
      repo: this.repo.name,
      issue_number: issueNumber,
      ...updates,
    });
    return this.issue(response.data);
  }

  /**
   * {@inheritDoc IGitHubHelper.getIssue}
   */
  async getIssue(issueNumber: number): Promise<IssueInfo> {
    return this.issue((await this.client.rest.issues.get({owner: this.repo.owner, repo: this.repo.name, issue_number: issueNumber})).data);
  }

  /**
   * {@inheritDoc IGitHubHelper.listIssues}
   */
  async listIssues(
    options: {
      state?: "open" | "closed" | "all";
      labels?: string[];
      assignee?: string;
    } = {},
  ): Promise<IssueInfo[]> {
    const listOptions = {
      owner: this.repo.owner,
      repo: this.repo.name,
      state: options.state ?? "open",
      per_page: 100,
      ...(options.labels ? {labels: options.labels.join(",")} : {}),
      ...(options.assignee ? {assignee: options.assignee} : {}),
    };
    const issues = await this.client.paginate(this.client.rest.issues.listForRepo, listOptions);
    return issues.map((issue) => this.issue(issue));
  }

  /**
   * {@inheritDoc IGitHubHelper.addLabels}
   */
  async addLabels(issueNumber: number, labels: string[]): Promise<void> {
    await this.client.rest.issues.addLabels({owner: this.repo.owner, repo: this.repo.name, issue_number: issueNumber, labels});
  }

  /**
   * {@inheritDoc IGitHubHelper.removeLabels}
   */
  async removeLabels(issueNumber: number, labels: string[]): Promise<void> {
    for (const name of labels)
      await this.client.rest.issues.removeLabel({owner: this.repo.owner, repo: this.repo.name, issue_number: issueNumber, name});
  }

  /**
   * {@inheritDoc IGitHubHelper.getClient}
   */
  getClient(): OctokitClient {
    return this.client;
  }

  private comment(value: NativeComment): Comment {
    return {
      id: value.id,
      body: value.body ?? "",
      author: value.user?.login ?? "unknown",
      createdAt: value.created_at,
      updatedAt: value.updated_at,
      url: value.html_url,
    };
  }

  private issue(value: NativeIssue): IssueInfo {
    return {
      number: value.number,
      title: value.title,
      body: value.body ?? "",
      state: value.state,
      url: value.html_url,
      labels: value.labels.map((label) => (typeof label === "string" ? label : (label.name ?? ""))),
      assignees: value.assignees?.map((assignee) => assignee.login) ?? [],
    };
  }
}

/**
 * Creates a new GitHub helper instance
 * @param token - GitHub token for authentication
 * @param context - Optional GitHub Actions context
 * @param options - Optional complete native client.
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
export function createGitHubHelper(token: string, context?: typeof github.context, options?: GitHubHelperOptions): IGitHubHelper {
  return new GitHubHelper(token, context, options);
}
