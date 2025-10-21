import type {ScriptParams} from "../types/index.ts";

/**
 * Retrieves file sizes for specified folders from a given git branch.
 * @param params - The script parameters (for core and exec).
 * @param branchName - The name of the branch (e.g., 'refs/remotes/origin/main', 'HEAD').
 * @param targetFolders - An array of folder paths to inspect.
 * @returns A map of file paths to their sizes in bytes.
 */
export async function getFileSizesFromGit(
  params: ScriptParams,
  branchName: string,
  targetFolders: string[],
): Promise<Record<string, number>> {
  const {core, exec} = params;
  const filesMap: Record<string, number> = {};
  for (const folder of targetFolders) {
    try {
      const folderPath = folder.endsWith("/") ? folder.slice(0, -1) : folder;
      const {stdout, stderr, exitCode} = await exec.getExecOutput(`git ls-tree -r -l ${branchName} -- ${folderPath}`, [], {
        ignoreReturnCode: true,
        silent: true,
      });

      if (exitCode !== 0) {
        core.debug(`git ls-tree for branch '${branchName}' and folder '${folderPath}' exited with ${exitCode}. Stderr: ${stderr || "N/A"}`);
        if (stderr && stderr.includes("fatal: Not a valid object name")) {
          core.warning(
            `Branch '${branchName}' or path '${folderPath}' might not exist or was not fetched correctly for bundle size check.`,
          );
        }
        continue;
      }

      if (!stdout || !stdout.trim()) {
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
              const size = parseInt(sizeStr, 10);
              if (!isNaN(size)) {
                filesMap[filePath] = size;
              } else {
                core.warning(`Could not parse size '${sizeStr}' from ls-tree line: '${line}'`);
              }
            }
          }
        } else {
          core.warning(`Could not parse line from ls-tree (expected tab separator): '${line}'`);
        }
      }
    } catch (error) {
      const err = error as Error;
      core.error(`Error processing folder ${folder} for branch ${branchName} with git ls-tree: ${err.message}`);
    }
  }
  return filesMap;
}

/**
 * Generates the branch comparison table section (commits, not bundle sizes).
 * @param params - The script parameters.
 * @param currentCommitSha - The full SHA of the current commit.
 * @param shortCurrentCommitSha - The short SHA of the current commit.
 * @returns Markdown string for the branch comparison section.
 */
export async function getBranchCommitComparisonSection(
  params: ScriptParams,
  currentCommitSha: string,
  shortCurrentCommitSha: string,
): Promise<string> {
  const {core, exec} = params;
  let section = `### 📊 Branch Comparison\n\n`;
  section += `| Branch          | SHA         | Commits vs. Main |\n`;
  section += `|-----------------|-------------|------------------|\n`;

  let mainBranchShaShort = "N/A";
  let commitsAhead = "N/A";

  try {
    await exec.getExecOutput("git fetch origin main:refs/remotes/origin/main --depth=50");
    const {stdout: mainShaFull} = await exec.getExecOutput("git rev-parse refs/remotes/origin/main");
    mainBranchShaShort = mainShaFull.trim().substring(0, 7);

    const {stdout: commitsAheadOutput} = await exec.getExecOutput(`git rev-list --count refs/remotes/origin/main..${currentCommitSha}`);
    commitsAhead = commitsAheadOutput.trim();
  } catch (error) {
    const err = error as Error;
    console.error("Failed to get main branch information for commit comparison:", err.message);
    core.warning(`Failed to retrieve main branch information for commit comparison: ${err.message}.`);
    mainBranchShaShort = "Error";
    commitsAhead = "Error";
  }

  section += `| **Preview**     | \`${shortCurrentCommitSha}\` | ${commitsAhead}          |\n`;
  section += `| **Main**        | \`${mainBranchShaShort}\` | N/A              |\n\n`;
  section += `----\n`;
  return section;
}

/**
 * Git diff statistics result
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
 * Computes diff statistics between two Git references
 * @param params - Script execution parameters
 * @param baseRef - Base reference (e.g., 'origin/main', 'HEAD~1')
 * @param headRef - Head reference (e.g., 'HEAD', commit SHA)
 * @returns Promise resolving to diff statistics
 * @example
 * ```typescript
 * const stats = await getGitDiffStats(params, 'origin/main', 'HEAD');
 * console.log(`${stats.filesChanged} files changed`);
 * console.log(`+${stats.linesAdded} -${stats.linesDeleted}`);
 * ```
 */
export async function getGitDiffStats(params: ScriptParams, baseRef: string, headRef: string): Promise<GitDiffStats> {
  const {core, exec} = params;

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

  if (insertionsMatch?.[1]) linesAdded = Number.parseInt(insertionsMatch[1], 10);
  if (deletionsMatch?.[1]) linesDeleted = Number.parseInt(deletionsMatch[1], 10);

  return {
    filesChanged,
    linesAdded,
    linesDeleted,
    rawStats,
  };
}

/**
 * Ensures a Git branch is fetched and available locally
 * @param params - Script execution parameters
 * @param branchName - Branch name to fetch (e.g., 'main')
 * @param remote - Remote name (defaults to 'origin')
 * @returns Promise that resolves when fetch is complete
 * @example
 * ```typescript
 * await ensureBranchFetched(params, 'main', 'origin');
 * // Now 'origin/main' is available for comparisons
 * ```
 */
export async function ensureBranchFetched(params: ScriptParams, branchName: string, remote: string = "origin"): Promise<void> {
  const {core, exec} = params;

  core.debug(`Ensuring ${remote}/${branchName} is fetched`);

  await exec.exec("git", ["fetch", remote, `${branchName}:refs/remotes/${remote}/${branchName}`], {
    ignoreReturnCode: true,
    silent: true,
  });

  core.debug(`Branch ${remote}/${branchName} fetch complete`);
}

/**
 * Gets the list of changed files between two Git references
 * @param params - Script execution parameters
 * @param baseRef - Base reference
 * @param headRef - Head reference
 * @returns Promise resolving to array of changed file paths
 * @example
 * ```typescript
 * const files = await getChangedFiles(params, 'origin/main', 'HEAD');
 * files.forEach(file => console.log(`Modified: ${file}`));
 * ```
 */
export async function getChangedFiles(params: ScriptParams, baseRef: string, headRef: string): Promise<string[]> {
  const {core, exec} = params;

  core.debug(`Getting changed files between ${baseRef} and ${headRef}`);

  const result = await exec.getExecOutput("git", ["diff", "--name-only", baseRef, headRef], {
    ignoreReturnCode: true,
    silent: true,
  });

  const files = result.stdout ? result.stdout.trim().split("\n").filter(Boolean) : [];

  core.debug(`Found ${files.length} changed files`);

  return files;
}
