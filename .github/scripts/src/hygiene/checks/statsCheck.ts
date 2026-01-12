/**
 * @fileoverview Stats check module for hygiene pipeline.
 * @module github/scripts/src/hygiene/checks/statsCheck
 *
 * @remarks
 * Computes code statistics including:
 * - Diff stats vs main branch and previous commit
 * - Top file extensions and directories impacted
 * - Bundle size analysis comparing main vs preview
 *
 * @example
 * ```typescript
 * import { runStatsCheck } from './statsCheck.ts';
 * const result = await runStatsCheck();
 * // Writes stats-result.json to artifacts directory
 * ```
 */

import * as core from "@actions/core";
import * as exec from "@actions/exec";
import * as fs from "node:fs/promises";
import * as path from "node:path";

import {
  type BundleFolderComparison,
  type DiffStats,
  type DirectoryStats,
  type ExtensionStats,
  type FileSizeComparison,
  type HygieneCheckResult,
  type StatsResult,
  createErrorResult,
  createSuccessResult,
} from "../types.ts";

/**
 * Artifact output directory (relative to workspace root)
 */
const ARTIFACT_DIR = "artifacts/hygiene";

/**
 * Artifact filename for stats check results
 */
const ARTIFACT_FILENAME = "stats-result.json";

/**
 * Bundle target folders to analyze
 */
const BUNDLE_TARGET_FOLDERS: readonly string[] = ["sites/arolariu.ro", "sites/api.arolariu.ro", "sites/docs.arolariu.ro"];

/**
 * Number of top extensions/directories to report
 */
const TOP_COUNT = 5;

/**
 * Runs the stats check and produces a result artifact
 *
 * @returns The stats check result
 */
export async function runStatsCheck(): Promise<HygieneCheckResult> {
  const startTime = performance.now();

  try {
    core.info("📊 Starting stats check...");

    const headRef = process.env["HEAD_REF"] ?? process.env["GITHUB_SHA"] ?? "HEAD";

    // Ensure we have main branch
    core.info("Fetching main branch for comparison...");
    await exec.getExecOutput("git", ["fetch", "origin", "main:refs/remotes/origin/main", "--depth=1", "--no-tags", "--quiet"], {
      ignoreReturnCode: true,
      silent: true,
    });

    // Get diff stats vs main
    core.info("Computing diff stats vs main branch...");
    const vsMain = await getDiffStats("origin/main", headRef);

    // Get diff stats vs previous commit
    core.info("Computing diff stats vs previous commit...");
    let vsPrevious: DiffStats | null = null;
    let isFirstCommit = false;

    try {
      const prevCheck = await exec.getExecOutput("git", ["rev-parse", "--verify", "HEAD~1"], {ignoreReturnCode: true, silent: true});

      if (prevCheck.exitCode === 0) {
        vsPrevious = await getDiffStats("HEAD~1", headRef);
      } else {
        isFirstCommit = true;
        core.info("First commit in PR - no previous commit to compare");
      }
    } catch {
      isFirstCommit = true;
    }

    // Get changed files for extension/directory analysis
    core.info("Analyzing changed files...");
    const changedFiles = await getChangedFiles("origin/main", headRef);

    const topExtensions = computeTopExtensions(changedFiles);
    const topDirectories = computeTopDirectories(changedFiles);

    // Compute bundle sizes
    core.info("Computing bundle sizes...");
    const bundleSizes = await computeBundleSizes(BUNDLE_TARGET_FOLDERS, headRef);

    const duration = Math.round(performance.now() - startTime);

    const stats: StatsResult = {
      vsMain,
      vsPrevious,
      isFirstCommit,
      churn: vsMain.linesAdded + vsMain.linesDeleted,
      netChange: vsMain.linesAdded - vsMain.linesDeleted,
      topExtensions,
      topDirectories,
      bundleSizes,
    };

    const result = createSuccessResult(
      "stats",
      `${vsMain.filesChanged} files changed, +${vsMain.linesAdded} -${vsMain.linesDeleted}`,
      duration,
      {
        stats,
      },
    );

    // Set GitHub Actions outputs for backward compatibility
    core.setOutput("files-changed", vsMain.filesChanged.toString());
    core.setOutput("lines-added", vsMain.linesAdded.toString());
    core.setOutput("lines-deleted", vsMain.linesDeleted.toString());

    if (vsPrevious) {
      core.setOutput("files-changed-vs-prev", vsPrevious.filesChanged.toString());
      core.setOutput("lines-added-vs-prev", vsPrevious.linesAdded.toString());
      core.setOutput("lines-deleted-vs-prev", vsPrevious.linesDeleted.toString());
    }
    core.setOutput("is-first-commit", isFirstCommit ? "true" : "false");

    // Write artifact
    await writeArtifact(result);

    core.info("✅ Stats check completed");
    return result;
  } catch (error) {
    const err = error as Error;
    const duration = Math.round(performance.now() - startTime);

    core.error(`❌ Stats check failed: ${err.message}`);

    const result = createErrorResult("stats", err, duration);
    await writeArtifact(result);

    return result;
  }
}

/**
 * Gets diff statistics between two refs
 */
async function getDiffStats(baseRef: string, headRef: string): Promise<DiffStats> {
  const result = await exec.getExecOutput("git", ["diff", "--numstat", `${baseRef}...${headRef}`], {ignoreReturnCode: true, silent: true});

  let filesChanged = 0;
  let linesAdded = 0;
  let linesDeleted = 0;

  const lines = result.stdout.trim().split("\n").filter(Boolean);
  for (const line of lines) {
    const [added, deleted] = line.split("\t");
    if (added !== undefined && deleted !== undefined && added !== "-") {
      filesChanged++;
      linesAdded += parseInt(added, 10) || 0;
      linesDeleted += parseInt(deleted, 10) || 0;
    }
  }

  return {filesChanged, linesAdded, linesDeleted};
}

/**
 * Gets list of changed files between refs
 */
async function getChangedFiles(baseRef: string, headRef: string): Promise<string[]> {
  const result = await exec.getExecOutput("git", ["diff", "--name-only", `${baseRef}...${headRef}`], {
    ignoreReturnCode: true,
    silent: true,
  });

  return result.stdout.trim().split("\n").filter(Boolean);
}

/**
 * Computes top N file extensions from changed files
 */
function computeTopExtensions(files: string[]): ExtensionStats[] {
  const counts = new Map<string, number>();

  for (const file of files) {
    const ext = path.extname(file).slice(1) || "(no extension)";
    counts.set(ext, (counts.get(ext) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_COUNT)
    .map(([extension, count]) => ({extension, count}));
}

/**
 * Computes top N directories from changed files
 */
function computeTopDirectories(files: string[]): DirectoryStats[] {
  const counts = new Map<string, number>();

  for (const file of files) {
    const dir = path.dirname(file).split(path.sep)[0] || "(root)";
    counts.set(dir, (counts.get(dir) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_COUNT)
    .map(([directory, count]) => ({directory, count}));
}

/**
 * Computes bundle sizes for target folders
 */
async function computeBundleSizes(folders: readonly string[], headRef: string): Promise<BundleFolderComparison[]> {
  const results: BundleFolderComparison[] = [];

  try {
    // Get file sizes from main branch
    const mainFiles = await getFileSizes("refs/remotes/origin/main", folders);

    // Get file sizes from current branch
    const previewFiles = await getFileSizes(headRef, folders);

    // Compare each folder
    for (const folder of folders) {
      const comparison = compareFolderSizes(folder, mainFiles, previewFiles);
      results.push(comparison);
    }
  } catch (error) {
    core.warning(`Could not compute bundle sizes: ${(error as Error).message}`);
  }

  return results;
}

/**
 * Gets file sizes for files in target folders from a git ref
 */
async function getFileSizes(ref: string, folders: readonly string[]): Promise<Record<string, number>> {
  const sizes: Record<string, number> = {};

  // Use git ls-tree to list all files in the folders
  for (const folder of folders) {
    try {
      const result = await exec.getExecOutput("git", ["ls-tree", "-r", "-l", ref, folder], {ignoreReturnCode: true, silent: true});

      if (result.exitCode === 0) {
        const lines = result.stdout.trim().split("\n").filter(Boolean);
        for (const line of lines) {
          // Format: mode type sha size\tpath
          const match = line.match(/^\d+ \w+ \w+\s+(\d+)\t(.+)$/);
          if (match) {
            const [, sizeStr, filePath] = match;
            sizes[filePath] = parseInt(sizeStr, 10);
          }
        }
      }
    } catch {
      // Folder might not exist in this ref
    }
  }

  return sizes;
}

/**
 * Compares file sizes for a folder between main and preview
 */
function compareFolderSizes(
  folder: string,
  mainFiles: Record<string, number>,
  previewFiles: Record<string, number>,
): BundleFolderComparison {
  const files: FileSizeComparison[] = [];
  let mainTotal = 0;
  let previewTotal = 0;

  // Collect all file paths in this folder
  const allPaths = new Set<string>();
  for (const p of Object.keys(mainFiles)) {
    if (p.startsWith(folder + "/")) allPaths.add(p);
  }
  for (const p of Object.keys(previewFiles)) {
    if (p.startsWith(folder + "/")) allPaths.add(p);
  }

  for (const filePath of allPaths) {
    const mainSize = mainFiles[filePath] ?? 0;
    const previewSize = previewFiles[filePath] ?? 0;

    mainTotal += mainSize;
    previewTotal += previewSize;

    const diff = previewSize - mainSize;

    // Only include changed files
    if (diff !== 0 || mainSize === 0 || previewSize === 0) {
      let status: FileSizeComparison["status"];
      if (mainSize === 0 && previewSize > 0) {
        status = "added";
      } else if (previewSize === 0 && mainSize > 0) {
        status = "removed";
      } else if (diff !== 0) {
        status = "modified";
      } else {
        status = "unchanged";
      }

      if (status !== "unchanged") {
        files.push({
          path: filePath.substring(folder.length + 1),
          mainSize,
          previewSize,
          diff,
          status,
        });
      }
    }
  }

  return {
    folder,
    mainTotal,
    previewTotal,
    totalDiff: previewTotal - mainTotal,
    filesChanged: files.length,
    files,
  };
}

/**
 * Writes the result to the artifact directory
 */
async function writeArtifact(result: HygieneCheckResult): Promise<void> {
  const workspaceRoot = process.env["GITHUB_WORKSPACE"] ?? process.cwd();
  const artifactDir = path.join(workspaceRoot, ARTIFACT_DIR);
  const artifactPath = path.join(artifactDir, ARTIFACT_FILENAME);

  // Ensure directory exists
  await fs.mkdir(artifactDir, {recursive: true});

  // Write JSON file
  await fs.writeFile(artifactPath, JSON.stringify(result, null, 2), "utf-8");

  core.info(`📦 Wrote artifact: ${artifactPath}`);
}

/**
 * Entry point when run directly
 */
export default runStatsCheck;
