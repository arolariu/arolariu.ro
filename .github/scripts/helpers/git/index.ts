/**
 * @fileoverview Git operations using @actions/exec
 * @module helpers/git
 * 
 * Provides a clean, type-safe API for Git operations in GitHub Actions.
 * Uses @actions/exec for executing Git commands with proper error handling.
 * Follows Single Responsibility Principle by focusing solely on Git operations.
 */

import * as exec from "@actions/exec";
import * as core from "@actions/core";

/**
 * Git diff statistics
 */
export interface GitDiffStats {
  /** Number of files changed */
  filesChanged: number;
  /** Number of lines added */
  linesAdded: number;
  /** Number of lines deleted */
  linesDeleted: number;
  /** Raw diff stat output */
  rawStats: string;
}

/**
 * Git commit information
 */
export interface GitCommit {
  /** Full commit SHA */
  sha: string;
  /** Short commit SHA (7 chars) */
  shortSha: string;
  /** Commit message */
  message: string;
  /** Author name */
  author: string;
  /** Author email */
  email: string;
  /** Commit timestamp */
  timestamp: string;
}

/**
 * Git file information
 */
export interface GitFile {
  /** File path */
  path: string;
  /** File size in bytes */
  size: number;
  /** Git object type (blob, tree, etc.) */
  type: string;
  /** Git object hash */
  hash: string;
}

/**
 * Git branch information
 */
export interface GitBranch {
  /** Branch name */
  name: string;
  /** Full commit SHA */
  sha: string;
  /** Short commit SHA */
  shortSha: string;
  /** Whether this is the current branch */
  isCurrent: boolean;
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
  getChangedFiles(baseRef: string, headRef: string): Promise<string[]>;

  /**
   * Gets file sizes from a Git tree
   * @param treeRef - Tree reference (branch, commit, etc.)
   * @param paths - Array of paths to inspect
   * @returns Promise resolving to map of file paths to sizes
   */
  getFileSizes(treeRef: string, paths: string[]): Promise<Record<string, number>>;

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
  listBranches(remote?: string): Promise<GitBranch[]>;

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
  exec(args: string[], options?: GitOptions): Promise<{ stdout: string; stderr: string; exitCode: number }>;
}

/**
 * Implementation of Git helper
 */
export class GitHelper implements IGitHelper {
  /**
   * {@inheritDoc IGitHelper.fetchBranch}
   */
  async fetchBranch(branchName: string, remote: string = "origin", depth?: number): Promise<void> {
    core.debug(`Fetching ${remote}/${branchName}${depth ? ` with depth ${depth}` : ""}`);

    const args = ["fetch", remote, `${branchName}:refs/remotes/${remote}/${branchName}`];
    if (depth) {
      args.push(`--depth=${depth}`);
    }

    await exec.exec("git", args, {
      ignoreReturnCode: true,
      silent: true,
    });

    core.debug(`Branch ${remote}/${branchName} fetch complete`);
  }

  /**
   * {@inheritDoc IGitHelper.getDiffStats}
   */
  async getDiffStats(baseRef: string, headRef: string): Promise<GitDiffStats> {
    core.debug(`Computing diff stats between ${baseRef} and ${headRef}`);

    // Get files changed
    const filesResult = await exec.getExecOutput("git", ["diff", "--name-only", baseRef, headRef], {
      ignoreReturnCode: true,
      silent: true,
    });

    const filesChanged = filesResult.stdout ? filesResult.stdout.trim().split("\n").filter(Boolean).length : 0;

    // Get diff stats
    const statsResult = await exec.getExecOutput("git", ["diff", "--shortstat", baseRef, headRef], {
      ignoreReturnCode: true,
      silent: true,
    });

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
  async getChangedFiles(baseRef: string, headRef: string): Promise<string[]> {
    core.debug(`Getting changed files between ${baseRef} and ${headRef}`);

    const result = await exec.getExecOutput("git", ["diff", "--name-only", baseRef, headRef], {
      ignoreReturnCode: true,
      silent: true,
    });

    const files = result.stdout ? result.stdout.trim().split("\n").filter(Boolean) : [];

    core.debug(`Found ${files.length} changed files`);

    return files;
  }

  /**
   * {@inheritDoc IGitHelper.getFileSizes}
   */
  async getFileSizes(treeRef: string, paths: string[]): Promise<Record<string, number>> {
    const filesMap: Record<string, number> = {};

    for (const path of paths) {
      try {
        const folderPath = path.endsWith("/") ? path.slice(0, -1) : path;
        const { stdout, stderr, exitCode } = await exec.getExecOutput(
          "git",
          ["ls-tree", "-r", "-l", treeRef, "--", folderPath],
          {
            ignoreReturnCode: true,
            silent: true,
          }
        );

        if (exitCode !== 0) {
          core.debug(`git ls-tree for '${treeRef}' and path '${folderPath}' exited with ${exitCode}`);
          if (stderr?.includes("fatal: Not a valid object name")) {
            core.warning(`Tree '${treeRef}' or path '${folderPath}' might not exist`);
          }
          continue;
        }

        if (!stdout?.trim()) {
          continue;
        }

        const lines = stdout.trim().split("\n");
        for (const line of lines) {
          if (!line.trim()) continue;

          const parts = line.split("\t");
          if (parts.length === 2 && parts[0] && parts[1]) {
            const meta = parts[0].trim().split(/\s+/);
            if (meta.length === 4 && meta[1] === "blob" && meta[3]) {
              const filePath = parts[1];
              const sizeStr = meta[3];

              if (sizeStr !== "-") {
                const size = Number.parseInt(sizeStr, 10);
                if (!Number.isNaN(size)) {
                  filesMap[filePath] = size;
                }
              }
            }
          }
        }
      } catch (error) {
        const err = error as Error;
        core.error(`Error processing path ${path} for tree ${treeRef}: ${err.message}`);
      }
    }

    return filesMap;
  }

  /**
   * {@inheritDoc IGitHelper.getCommit}
   */
  async getCommit(ref: string = "HEAD"): Promise<GitCommit> {
    core.debug(`Getting commit info for ${ref}`);

    const format = "%H%n%h%n%s%n%an%n%ae%n%aI";
    const result = await exec.getExecOutput("git", ["show", "-s", `--format=${format}`, ref], {
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

    const result = await exec.getExecOutput("git", ["rev-list", "--count", `${baseRef}..${headRef}`], {
      silent: true,
    });

    const count = Number.parseInt(result.stdout.trim(), 10);
    return Number.isNaN(count) ? 0 : count;
  }

  /**
   * {@inheritDoc IGitHelper.refExists}
   */
  async refExists(ref: string): Promise<boolean> {
    try {
      const result = await exec.getExecOutput("git", ["rev-parse", "--verify", ref], {
        ignoreReturnCode: true,
        silent: true,
      });

      return result.exitCode === 0;
    } catch {
      return false;
    }
  }

  /**
   * {@inheritDoc IGitHelper.getCurrentBranch}
   */
  async getCurrentBranch(): Promise<string> {
    const result = await exec.getExecOutput("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
      silent: true,
    });

    return result.stdout.trim();
  }

  /**
   * {@inheritDoc IGitHelper.listBranches}
   */
  async listBranches(remote?: string): Promise<GitBranch[]> {
    const args = ["branch", "--list", "--format=%(refname:short)|%(objectname)|%(objectname:short)|%(HEAD)"];
    if (remote) {
      args.push("--remote");
      args.push(`${remote}/*`);
    }

    const result = await exec.getExecOutput("git", args, {
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

    await exec.exec("git", args);
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

    await exec.exec("git", args);
  }

  /**
   * {@inheritDoc IGitHelper.exec}
   */
  async exec(args: string[], options: GitOptions = {}): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const result = await exec.getExecOutput("git", args, {
      cwd: options.cwd,
      ignoreReturnCode: options.ignoreReturnCode ?? false,
      silent: options.silent ?? false,
    });

    return result;
  }
}

/**
 * Creates a new instance of the Git helper
 * @returns Git helper instance
 * @example
 * ```typescript
 * const git = createGitHelper();
 * await git.fetchBranch('main', 'origin');
 * const stats = await git.getDiffStats('origin/main', 'HEAD');
 * const files = await git.getChangedFiles('HEAD~1', 'HEAD');
 * ```
 */
export function createGitHelper(): IGitHelper {
  return new GitHelper();
}

/**
 * Default Git helper instance
 * Exported for convenience - can be used directly without creating an instance
 */
export const git = createGitHelper();
