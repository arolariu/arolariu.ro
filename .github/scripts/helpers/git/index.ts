/**
 * @fileoverview Git operations using @actions/exec.
 * @module github/scripts/helpers/git
 *
 * @remarks
 * Provides a clean, type-safe API for Git operations in GitHub Actions.
 * Uses @actions/exec for executing Git commands with proper error handling.
 * Follows Single Responsibility Principle by focusing solely on Git operations.
 */

import * as core from "../sdk/core.ts";
import * as exec from "../sdk/exec.ts";
import {CommandExecutionError, execChecked, type CheckedExecOptions} from "../exec/index.ts";

/** Change kinds represented by Git's name-status protocol. */
export type GitChangeKind = "added" | "modified" | "deleted" | "renamed" | "copied" | "type-changed" | "unmerged";

/** Exact repository-relative filename; a rename/copy also retains its origin. */
export interface GitChange {
  readonly kind: GitChangeKind;
  readonly path: string;
  readonly previousPath?: string;
}

/** A known merge-base comparison or an explicit inability to determine scope. */
export type GitChangeSet =
  | Readonly<{scope: "known"; baseSha: string; headSha: string; entries: readonly GitChange[]}>
  | Readonly<{scope: "unknown"; reason: string}>;

/**
 * Git diff statistics
 */
export interface GitDiffStats {
  /** Number of files changed */
  readonly filesChanged: number;
  /** Number of lines added */
  readonly linesAdded: number;
  /** Number of lines deleted */
  readonly linesDeleted: number;
  /** Raw diff stat output */
  readonly rawStats: string;
}

/**
 * Git commit information
 */
export interface GitCommit {
  /** Full commit SHA */
  readonly sha: string;
  /** Short commit SHA (7 chars) */
  readonly shortSha: string;
  /** Commit message */
  readonly message: string;
  /** Author name */
  readonly author: string;
  /** Author email */
  readonly email: string;
  /** Commit timestamp */
  readonly timestamp: string;
}

/**
 * Git file information
 */
export interface GitFile {
  /** File path */
  readonly path: string;
  /** File size in bytes */
  readonly size: number;
  /** Git object type (blob, tree, etc.) */
  readonly type: string;
  /** Git object hash */
  readonly hash: string;
}

/**
 * Git branch information
 */
export interface GitBranch {
  /** Branch name */
  readonly name: string;
  /** Full commit SHA */
  readonly sha: string;
  /** Short commit SHA */
  readonly shortSha: string;
  /** Whether this is the current branch */
  readonly isCurrent: boolean;
}

/**
 * Git operation options
 */
export interface GitOptions {
  /** Working directory for Git command */
  cwd?: string;
  /** Whether to ignore non-zero exit codes */
  ignoreReturnCode?: boolean;
  /** Whether to suppress output */
  silent?: boolean;
}

/**
 * Git helper interface
 * Provides methods for common Git operations
 */
export interface IGitHelper {
  /**
   * Fetches a branch from remote
   * @param branchName - Branch name to fetch
   * @param remote - Remote name (default: 'origin')
   * @param depth - Fetch depth (undefined for full history)
   * @returns Promise resolving when fetch completes
   */
  fetchBranch(branchName: string, remote?: string, depth?: number): Promise<void>;

  /**
   * Gets diff statistics between two references
   * @param baseRef - Base reference
   * @param headRef - Head reference
   * @returns Promise resolving to diff statistics
   */
  getDiffStats(baseRef: string, headRef: string): Promise<GitDiffStats>;

  /**
   * Gets list of changed files between two references
   * @param baseRef - Base reference
   * @param headRef - Head reference
   * @returns Promise resolving to array of changed file paths
   */
  getChangedFiles(baseRef: string, headRef: string): Promise<readonly string[]>;

  /**
   * Collects committed PR changes using immutable refs and a merge-base diff.
   * @param workspaceRoot - Repository directory in which Git runs.
   * @param baseRef - Base reference to resolve.
   * @param headRef - Head reference to resolve.
   * @returns Exact NUL-decoded names, or unknown scope with a logged reason.
   * @throws Native startup errors; operational Git exits are represented as unknown scope.
   */
  getChangeSet(workspaceRoot: string, baseRef: string, headRef: string): Promise<GitChangeSet>;

  /**
   * Gets file sizes from a Git tree
   * @param treeRef - Tree reference (branch, commit, etc.)
   * @param paths - Array of paths to inspect
   * @returns Promise resolving to map of file paths to sizes
   */
  getFileSizes(treeRef: string, paths: readonly string[]): Promise<Record<string, number>>;

  /**
   * Gets commit information
   * @param ref - Reference to get commit info for (default: HEAD)
   * @returns Promise resolving to commit information
   */
  getCommit(ref?: string): Promise<GitCommit>;

  /**
   * Gets the number of commits between two references
   * @param baseRef - Base reference
   * @param headRef - Head reference
   * @returns Promise resolving to commit count
   */
  getCommitCount(baseRef: string, headRef: string): Promise<number>;

  /**
   * Checks if a reference exists
   * @param ref - Reference to check
   * @returns Promise resolving to true if reference exists
   */
  refExists(ref: string): Promise<boolean>;

  /**
   * Gets the current branch name
   * @returns Promise resolving to branch name
   */
  getCurrentBranch(): Promise<string>;

  /**
   * Lists all branches
   * @param remote - Optional remote name to list remote branches
   * @returns Promise resolving to array of branch information
   */
  listBranches(remote?: string): Promise<readonly GitBranch[]>;

  /**
   * Creates a new branch
   * @param branchName - Name of the branch to create
   * @param startPoint - Starting point (commit, branch, etc.)
   * @returns Promise resolving when branch is created
   */
  createBranch(branchName: string, startPoint?: string): Promise<void>;

  /**
   * Checks out a branch or commit
   * @param ref - Reference to checkout
   * @param createBranch - Whether to create the branch if it doesn't exist
   * @returns Promise resolving when checkout completes
   */
  checkout(ref: string, createBranch?: boolean): Promise<void>;

  /**
   * Executes a custom Git command
   * @param args - Git command arguments
   * @param options - Execution options
   * @returns Promise resolving to command output
   */
  exec(
    args: readonly string[],
    options?: GitOptions,
  ): Promise<{readonly stdout: string; readonly stderr: string; readonly exitCode: number}>;
}

/**
 * Implementation of Git helper
 */
export class GitHelper implements IGitHelper {
  private readonly options: Readonly<Pick<GitOptions, "cwd">>;

  /**
   * Scopes reusable operations without changing process.cwd or shared state.
   * @param options - Optional working directory; explicit per-call roots override it.
   */
  constructor(options: Readonly<Pick<GitOptions, "cwd">> = {}) {
    this.options = {...options};
  }

  private checked(args: readonly string[], options: Readonly<CheckedExecOptions> = {}): Promise<exec.ExecOutput> {
    return execChecked("git", args, {...this.options, ...options});
  }

  /**
   * {@inheritDoc IGitHelper.fetchBranch}
   */
  async fetchBranch(branchName: string, remote: string = "origin", depth?: number): Promise<void> {
    core.debug(`Fetching ${remote}/${branchName}${depth ? ` with depth ${depth}` : ""}`);

    const args = ["fetch", remote, `${branchName}:refs/remotes/${remote}/${branchName}`];
    if (depth) {
      args.push(`--depth=${depth}`);
    }

    await this.checked(args, {silent: true});

    core.debug(`Branch ${remote}/${branchName} fetch complete`);
  }

  /**
   * {@inheritDoc IGitHelper.getDiffStats}
   */
  async getDiffStats(baseRef: string, headRef: string): Promise<GitDiffStats> {
    core.debug(`Computing diff stats between ${baseRef} and ${headRef}`);

    const filesChanged = (await this.getChangedFiles(baseRef, headRef)).length;

    // Get diff stats
    const statsResult = await this.checked(["diff", "--shortstat", baseRef, headRef], {silent: true});

    const rawStats = statsResult.stdout.trim();
    core.debug(`Git diff --shortstat: ${rawStats || "No changes"}`);

    // Parse lines added/deleted
    let linesAdded = 0;
    let linesDeleted = 0;

    const insertionsRegex = /(\d+) insertion/;
    const deletionsRegex = /(\d+) deletion/;

    const insertionsMatch = insertionsRegex.exec(rawStats);
    const deletionsMatch = deletionsRegex.exec(rawStats);

    if (insertionsMatch?.[1]) {
      linesAdded = Number.parseInt(insertionsMatch[1], 10);
    }
    if (deletionsMatch?.[1]) {
      linesDeleted = Number.parseInt(deletionsMatch[1], 10);
    }

    return {
      filesChanged,
      linesAdded,
      linesDeleted,
      rawStats,
    };
  }

  /**
   * {@inheritDoc IGitHelper.getChangedFiles}
   */
  async getChangedFiles(baseRef: string, headRef: string): Promise<readonly string[]> {
    core.debug(`Getting changed files between ${baseRef} and ${headRef}`);

    const result = await this.checked(["diff", "--name-only", "-z", baseRef, headRef, "--"], {silent: true});

    const files = result.stdout.split("\0").filter((file) => file.length > 0);

    core.debug(`Found ${files.length} changed files`);

    return files;
  }

  /** {@inheritDoc IGitHelper.getChangeSet} */
  async getChangeSet(workspaceRoot: string, baseRef: string, headRef: string): Promise<GitChangeSet> {
    const unknown = (reason: string): GitChangeSet => {
      core.warning(reason);
      return {scope: "unknown", reason};
    };
    const options = {cwd: workspaceRoot, ignoreReturnCode: true, silent: true};
    const base = await exec.getExecOutput("git", ["rev-parse", "--verify", "--end-of-options", `${baseRef}^{commit}`], options);
    if (base.exitCode !== 0) return unknown(`Could not resolve hygiene base ref (exit ${base.exitCode}): ${base.stderr.slice(-2000)}`);
    const head = await exec.getExecOutput("git", ["rev-parse", "--verify", "--end-of-options", `${headRef}^{commit}`], options);
    if (head.exitCode !== 0) return unknown(`Could not resolve hygiene head ref (exit ${head.exitCode}): ${head.stderr.slice(-2000)}`);
    const baseSha = base.stdout.trim();
    const headSha = head.stdout.trim();
    const validSha = /^(?:[a-f\d]{40}|[a-f\d]{64})$/i;
    if (!validSha.test(baseSha) || !validSha.test(headSha)) return unknown("Git returned an invalid commit identity.");

    const diff = await exec.getExecOutput(
      "git",
      ["diff", "--name-status", "-z", "--find-renames", `${baseSha}...${headSha}`, "--"],
      options,
    );
    if (diff.exitCode !== 0) return unknown(`Could not compute merge-base changes (exit ${diff.exitCode}): ${diff.stderr.slice(-2000)}`);
    const records = diff.stdout.split("\0");
    if (records.at(-1) === "") records.pop();
    const entries: GitChange[] = [];
    const kinds: Readonly<Record<string, GitChangeKind | undefined>> = {
      A: "added",
      M: "modified",
      D: "deleted",
      R: "renamed",
      C: "copied",
      T: "type-changed",
      U: "unmerged",
    };
    for (let index = 0; index < records.length;) {
      const status = records[index++];
      const path = records[index++];
      const kind = status && kinds[status[0] ?? ""];
      if (!kind || !path) return unknown("Git returned an invalid name-status record.");
      if (kind === "renamed" || kind === "copied") {
        const destination = records[index++];
        if (!destination) return unknown("Git returned an incomplete rename/copy record.");
        entries.push({kind, previousPath: path, path: destination});
      } else {
        entries.push({kind, path});
      }
    }
    return {scope: "known", baseSha, headSha, entries};
  }

  /**
   * {@inheritDoc IGitHelper.getFileSizes}
   */
  async getFileSizes(treeRef: string, paths: readonly string[]): Promise<Record<string, number>> {
    const filesMap = new Map<string, number>();

    for (const path of paths) {
      const folderPath = path.endsWith("/") ? path.slice(0, -1) : path;
      const {stdout} = await this.checked(["ls-tree", "-r", "-l", "-z", treeRef, "--", folderPath], {silent: true});
      for (const record of stdout.split("\0").filter(Boolean)) {
        const separator = record.indexOf("\t");
        const metadata = record.slice(0, separator).trim().split(/\s+/);
        if (separator < 0 || metadata.length !== 4) throw new Error("Git returned an invalid tree record.");
        if (metadata[1] !== "blob" || metadata[3] === "-") continue;
        const size = Number(metadata[3]);
        if (!Number.isSafeInteger(size) || size < 0) throw new Error("Git returned an invalid blob size.");
        filesMap.set(record.slice(separator + 1), size);
      }
    }

    return Object.fromEntries(filesMap);
  }

  /**
   * {@inheritDoc IGitHelper.getCommit}
   */
  async getCommit(ref: string = "HEAD"): Promise<GitCommit> {
    core.debug(`Getting commit info for ${ref}`);

    const format = "%H%n%h%n%s%n%an%n%ae%n%aI";
    const result = await this.checked(["show", "-s", `--format=${format}`, ref], {
      silent: true,
    });

    const lines = result.stdout.trim().split("\n");
    if (lines.length < 6) {
      throw new Error(`Failed to parse commit info for ${ref}`);
    }

    return {
      sha: lines[0]!.trim(),
      shortSha: lines[1]!.trim(),
      message: lines[2]!.trim(),
      author: lines[3]!.trim(),
      email: lines[4]!.trim(),
      timestamp: lines[5]!.trim(),
    };
  }

  /**
   * {@inheritDoc IGitHelper.getCommitCount}
   */
  async getCommitCount(baseRef: string, headRef: string): Promise<number> {
    core.debug(`Counting commits between ${baseRef} and ${headRef}`);

    const result = await this.checked(["rev-list", "--count", `${baseRef}..${headRef}`], {
      silent: true,
    });

    const text = result.stdout.trim();
    const count = Number(text);
    if (!/^\d+$/.test(text) || !Number.isSafeInteger(count)) throw new Error("Git returned an invalid commit count.");
    return count;
  }

  /**
   * {@inheritDoc IGitHelper.refExists}
   */
  async refExists(ref: string): Promise<boolean> {
    const result = await exec.getExecOutput("git", ["rev-parse", "--verify", ref], {...this.options, ignoreReturnCode: true, silent: true});
    if (result.exitCode === 0) return true;
    if (result.exitCode === 1 || result.exitCode === 128) return false;
    throw new CommandExecutionError("git", result);
  }

  /**
   * {@inheritDoc IGitHelper.getCurrentBranch}
   */
  async getCurrentBranch(): Promise<string> {
    const result = await this.checked(["rev-parse", "--abbrev-ref", "HEAD"], {
      silent: true,
    });

    return result.stdout.trim();
  }

  /**
   * {@inheritDoc IGitHelper.listBranches}
   */
  async listBranches(remote?: string): Promise<readonly GitBranch[]> {
    const args = ["branch", "--list", "--format=%(refname:short)|%(objectname)|%(objectname:short)|%(HEAD)"];
    if (remote) {
      args.push("--remote");
      args.push(`${remote}/*`);
    }

    const result = await this.checked(args, {
      silent: true,
    });

    const branches: GitBranch[] = [];
    const lines = result.stdout.trim().split("\n");

    for (const line of lines) {
      if (!line.trim()) continue;

      const parts = line.split("|");
      if (parts.length === 4) {
        branches.push({
          name: parts[0]!.trim(),
          sha: parts[1]!.trim(),
          shortSha: parts[2]!.trim(),
          isCurrent: parts[3]!.trim() === "*",
        });
      }
    }

    return branches;
  }

  /**
   * {@inheritDoc IGitHelper.createBranch}
   */
  async createBranch(branchName: string, startPoint?: string): Promise<void> {
    core.debug(`Creating branch ${branchName}${startPoint ? ` from ${startPoint}` : ""}`);

    const args = ["branch", branchName];
    if (startPoint) {
      args.push(startPoint);
    }

    if (this.options.cwd === undefined) await exec.exec("git", args);
    else await exec.exec("git", args, this.options);
  }

  /**
   * {@inheritDoc IGitHelper.checkout}
   */
  async checkout(ref: string, createBranch: boolean = false): Promise<void> {
    core.debug(`Checking out ${ref}${createBranch ? " (create new branch)" : ""}`);

    const args = ["checkout"];
    if (createBranch) {
      args.push("-b");
    }
    args.push(ref);

    if (this.options.cwd === undefined) await exec.exec("git", args);
    else await exec.exec("git", args, this.options);
  }

  /**
   * {@inheritDoc IGitHelper.exec}
   */
  async exec(
    args: readonly string[],
    options: GitOptions = {},
  ): Promise<{readonly stdout: string; readonly stderr: string; readonly exitCode: number}> {
    const execOptions: Parameters<typeof exec.getExecOutput>[2] = {
      ...this.options,
      ignoreReturnCode: options.ignoreReturnCode ?? false,
      silent: options.silent ?? false,
    };
    if (options.cwd) {
      execOptions.cwd = options.cwd;
    }

    const result = await exec.getExecOutput("git", [...args], execOptions);

    return result;
  }
}

/**
 * Creates a new instance of the Git helper
 * @param options - Optional immutable working-directory scope for reusable operations.
 * @returns Git helper instance
 * @example
 * ```typescript
 * const git = createGitHelper();
 * await git.fetchBranch('main', 'origin');
 * const stats = await git.getDiffStats('origin/main', 'HEAD');
 * const files = await git.getChangedFiles('HEAD~1', 'HEAD');
 * ```
 */
export function createGitHelper(options?: Readonly<Pick<GitOptions, "cwd">>): IGitHelper {
  return new GitHelper(options);
}

/**
 * Default Git helper instance
 * Exported for convenience - can be used directly without creating an instance
 */
export const git = createGitHelper();
