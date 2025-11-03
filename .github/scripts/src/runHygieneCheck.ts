/**
 * @fileoverview Unified code hygiene check script for GitHub Actions workflows
 * @module src/runHygieneCheck
 *
 * This module consolidates all code hygiene operations into a single, clean entry point:
 * - **Change Detection**: Detects file changes between Git references
 * - **Code Statistics**: Computes diff stats, bundle sizes, and change metrics
 * - **Format Checking**: Validates code formatting with Prettier
 * - **Lint Checking**: Runs ESLint to detect code quality issues
 * - **PR Comments**: Posts comprehensive hygiene reports to pull requests
 *
 * The script supports multiple modes of operation controlled by the CHECK_MODE environment variable:
 * - `detect`: Change detection only
 * - `stats`: Code statistics and bundle size analysis
 * - `format`: Format checking with Prettier
 * - `lint`: Linting with ESLint
 * - `comment`: Posts unified hygiene comment to PR
 *
 * @example
 * ```typescript
 * // In GitHub Actions workflow
 * const { default: runHygieneCheck } = await import('./runHygieneCheck.ts');
 * await runHygieneCheck();
 * ```
 */

import * as core from "@actions/core";
import * as exec from "@actions/exec";
import prettyBytes from "pretty-bytes";
import {
  BUNDLE_TARGET_FOLDERS,
  HYGIENE_CHECK_COMMENT_IDENTIFIER,
  createCommentBuilder,
  createGitHubHelper,
  env,
  git,
} from "../helpers/index.ts";

/**
 * Bundle size comparison types
 */
interface FileComparisonItem {
  path: string;
  mainSize: number;
  previewSize: number;
  diff: number;
  status: "Added" | "Removed" | "Modified";
}

interface BundleSizeComparison {
  folder: string;
  mainTotalSize: number;
  previewTotalSize: number;
  totalDiff: number;
  filesChanged: FileComparisonItem[];
  hasChanges: boolean;
}

/**
 * Compares file sizes for a specific folder between main and preview branches
 * @param folder - Folder path to analyze
 * @param mainBranchFiles - Record of file paths to sizes from main branch
 * @param previewBranchFiles - Record of file paths to sizes from preview branch
 * @returns Comparison result containing total sizes, differences, and changed files
 */
function compareFolderSizes(
  folder: string,
  mainBranchFiles: Record<string, number>,
  previewBranchFiles: Record<string, number>,
): BundleSizeComparison {
  const filesInFolder: FileComparisonItem[] = [];
  let folderMainTotalSize = 0;
  let folderPreviewTotalSize = 0;

  // Collect all relevant file paths
  const relevantFilePaths = new Set<string>();
  for (const p of Object.keys(mainBranchFiles)) {
    if (p.startsWith(folder + "/")) relevantFilePaths.add(p);
  }
  for (const p of Object.keys(previewBranchFiles)) {
    if (p.startsWith(folder + "/")) relevantFilePaths.add(p);
  }

  // Compare each file
  for (const path of relevantFilePaths) {
    const mainSize = mainBranchFiles[path];
    const previewSize = previewBranchFiles[path];

    if (mainSize !== undefined) folderMainTotalSize += mainSize;
    if (previewSize !== undefined) folderPreviewTotalSize += previewSize;

    if (mainSize === undefined && previewSize !== undefined) {
      // File added
      filesInFolder.push({path, mainSize: 0, previewSize, diff: previewSize, status: "Added"});
    } else if (mainSize !== undefined && previewSize === undefined) {
      // File removed
      filesInFolder.push({path, mainSize, previewSize: 0, diff: -mainSize, status: "Removed"});
    } else if (mainSize !== undefined && previewSize !== undefined && mainSize !== previewSize) {
      // File modified
      const diff = previewSize - mainSize;
      filesInFolder.push({path, mainSize, previewSize, diff, status: "Modified"});
    }
  }

  const folderDiff = folderPreviewTotalSize - folderMainTotalSize;
  const hasChanges = filesInFolder.length > 0 || folderDiff !== 0;

  return {
    folder,
    mainTotalSize: folderMainTotalSize,
    previewTotalSize: folderPreviewTotalSize,
    totalDiff: folderDiff,
    filesChanged: filesInFolder,
    hasChanges,
  };
}

/**
 * Fetches and compares file sizes between main and preview branches for specified folders
 * @param targetFolders - Array of folder paths to analyze
 * @returns Promise resolving to array of comparison results, one per folder
 */
async function compareBundleSizes(targetFolders: readonly string[]): Promise<BundleSizeComparison[]> {
  const results: BundleSizeComparison[] = [];

  try {
    core.info(`🔍 Starting bundle size comparison for ${targetFolders.length} folder(s)`);

    // Fetch main branch
    core.debug("Fetching main branch for comparison...");
    await exec.getExecOutput("git fetch origin main:refs/remotes/origin/main --depth=1 --no-tags --quiet");
    core.debug("✓ Main branch fetched successfully");

    // Get file sizes from both branches
    core.info("Retrieving file sizes from main branch...");
    const mainBranchFiles = await git.getFileSizes("refs/remotes/origin/main", targetFolders);
    core.debug(`Found ${Object.keys(mainBranchFiles).length} files in main branch`);

    core.info("Retrieving file sizes from preview branch...");
    const previewBranchFiles = await git.getFileSizes("HEAD", targetFolders);
    core.debug(`Found ${Object.keys(previewBranchFiles).length} files in preview branch`);

    // Compare each folder
    for (const folder of targetFolders) {
      core.debug(`Comparing folder: ${folder}`);
      const comparison = compareFolderSizes(folder, mainBranchFiles, previewBranchFiles);
      results.push(comparison);

      if (comparison.hasChanges) {
        core.info(`📊 ${folder}: ${comparison.filesChanged.length} file(s) changed, total diff: ${comparison.totalDiff} bytes`);
      } else {
        core.debug(`${folder}: No changes detected`);
      }
    }

    core.info(`✓ Bundle size comparison completed for ${results.length} folder(s)`);
    return results;
  } catch (error) {
    const err = error as Error;
    core.error(`❌ Bundle size comparison failed: ${err.message}`);
    throw new Error(`Failed to compare bundle sizes: ${err.message}`);
  }
}

/**
 * Generates a markdown table showing individual file changes within a folder
 * @param folder - Folder path for calculating relative paths
 * @param filesChanged - Array of file comparison items with size differences
 * @returns Markdown table string with file-level change details
 */
function generateFileChangesTable(folder: string, filesChanged: FileComparisonItem[]): string {
  let table = `| File Path (relative to folder) | Main Branch | Preview Branch | Difference | Status   |\n`;
  table += `|--------------------------------|-------------|----------------|------------|----------|\n`;

  filesChanged.sort((a, b) => a.path.localeCompare(b.path));

  for (const item of filesChanged) {
    let itemDiffSign = "";
    if (item.diff > 0) {
      itemDiffSign = "+";
    } else if (item.diff < 0) {
      itemDiffSign = "-";
    }

    const itemDiffDisplay = item.diff === 0 ? "---" : `${itemDiffSign}${prettyBytes(Math.abs(item.diff))}`;
    const relativePath = item.path.substring(folder.length + 1);

    table += `| \`${relativePath}\` | ${prettyBytes(item.mainSize ?? 0)} | ${prettyBytes(
      item.previewSize ?? 0,
    )} | ${itemDiffDisplay} | ${item.status} |\n`;
  }

  table += `\n`;
  return table;
}

/**
 * Generates a markdown collapsible section for a single folder's size comparison
 * @param comparison - Bundle size comparison data for one folder
 * @returns Markdown string with <details> element containing folder analysis
 */
function generateFolderComparisonMarkdown(comparison: BundleSizeComparison): string {
  const {folder, mainTotalSize, previewTotalSize, totalDiff, filesChanged, hasChanges} = comparison;

  let section = `<details>\n`;

  if (!hasChanges) {
    section += `<summary><strong>\`${folder}\`</strong> - No changes (Preview: ${prettyBytes(
      previewTotalSize,
    )}, Main: ${prettyBytes(mainTotalSize)})</summary>\n`;
    section += `  _No file changes detected in this folder._\n\n`;
    section += `</details>\n\n`;
    return section;
  }

  // Determine diff display
  let diffSign = "";
  if (totalDiff > 0) {
    diffSign = "+";
  } else if (totalDiff < 0) {
    diffSign = "-";
  }
  const diffDisplay = totalDiff === 0 ? "---" : `${diffSign}${prettyBytes(Math.abs(totalDiff))}`;

  // Determine folder status
  let folderStatusText = "Modified";
  if (filesChanged.length === 0 && totalDiff !== 0) {
    folderStatusText = "Size Changed";
  } else if (previewTotalSize === 0 && mainTotalSize > 0) {
    folderStatusText = "Removed";
  } else if (mainTotalSize === 0 && previewTotalSize > 0) {
    folderStatusText = "Added";
  } else if (totalDiff === 0 && filesChanged.length > 0) {
    folderStatusText = "Internally Modified";
  }

  section += `<summary><strong>\`${folder}\`</strong> - Total Diff: ${diffDisplay} (Preview: ${prettyBytes(
    previewTotalSize,
  )} vs Main: ${prettyBytes(mainTotalSize)}) - ${filesChanged.length} file(s) changed (${folderStatusText})</summary>\n\n`;

  if (filesChanged.length > 0) {
    section += generateFileChangesTable(folder, filesChanged);
  } else {
    section += `  _No individual file changes in this folder, but total size may have changed due to other factors._\n\n`;
  }

  section += `</details>\n\n`;
  return section;
}

/**
 * Generates a markdown section summarizing all bundle size comparisons
 * @param comparisons - Array of bundle size comparison results
 * @returns Formatted markdown string with expandable folder sections
 */
function generateBundleSizeMarkdown(comparisons: BundleSizeComparison[]): string {
  let section = `### 📦 Bundle Size Analysis (vs. Main)\n\n`;
  const anyChanges = comparisons.some((c) => c.hasChanges);

  for (const comp of comparisons) {
    section += generateFolderComparisonMarkdown(comp);
  }

  if (!anyChanges) {
    section += "No significant changes in bundle sizes for monitored folders.\n\n";
  }

  section += `----\n`;
  return section;
}

/**
 * Check mode for the code hygiene script
 */
export type CheckMode = "detect" | "stats" | "format" | "lint" | "comment";

/**
 * Result of code hygiene checks
 */
export interface CodeHygieneResult {
  /** Whether the check passed */
  success: boolean;
  /** Number of files changed (stats/detect mode) */
  filesChanged?: number;
  /** Lines added (stats mode) */
  linesAdded?: number;
  /** Lines deleted (stats mode) */
  linesDeleted?: number;
  /** Bundle size comparison markdown (stats mode) */
  bundleSizeMarkdown?: string;
  /** Files changed vs main branch (stats mode) */
  filesChangedVsMain?: number;
  /** Lines added vs main branch (stats mode) */
  linesAddedVsMain?: number;
  /** Lines deleted vs main branch (stats mode) */
  linesDeletedVsMain?: number;
  /** Files changed vs previous commit (stats mode) */
  filesChangedVsPrev?: number;
  /** Lines added vs previous commit (stats mode) */
  linesAddedVsPrev?: number;
  /** Lines deleted vs previous commit (stats mode) */
  linesDeletedVsPrev?: number;
  /** Whether this is the first commit in PR (stats mode) */
  isFirstCommit?: boolean;
  /** Whether formatting changes are needed (format mode) */
  formattingNeeded?: boolean;
  /** List of files that need formatting (format mode) */
  filesNeedingFormat?: string[];
  /** Whether linting errors exist (lint mode) */
  lintingErrors?: boolean;
  /** Linting error output (lint mode) */
  lintOutput?: string;
  /** List of changed files (detect mode) */
  changedFiles?: readonly string[];
  /** Error message if check failed */
  error?: string;
}

// ============================================================================
// CHANGE DETECTION
// ============================================================================

/**
 * Detects file changes between two Git references
 * Uses new helper architecture for cleaner, more maintainable code
 */
async function detectChanges(): Promise<CodeHygieneResult> {
  // Get Git references from environment
  const baseRef = env.get("BASE_REF", "origin/main") ?? "origin/main";
  const headRef = env.get("HEAD_REF") ?? env.get("GITHUB_SHA") ?? "HEAD";

  core.info(`🔍 Performing change detection between '${baseRef}' and '${headRef}'`);

  try {
    // Ensure base branch is fetched if it's a branch ref (helps with shallow clones)
    if (baseRef === "origin/main" || baseRef.endsWith("main")) {
      core.debug("Fetching main branch to ensure it's available");
      await git.fetchBranch("main", "origin");
    }

    // Get changed files using the Git helper
    const changedFiles = await git.getChangedFiles(baseRef, headRef);
    const hasChanges = changedFiles.length > 0;

    // Set workflow outputs
    core.setOutput("has-changes", hasChanges ? "true" : "false");
    core.setOutput("changed-files", changedFiles.join(","));
    core.setOutput("changed-files-count", changedFiles.length.toString());

    core.info(`✅ Change detection complete: ${changedFiles.length} file(s) changed.`);

    return {
      success: true,
      changedFiles,
      filesChanged: changedFiles.length,
    };
  } catch (error) {
    const err = error as Error;
    core.error(`❌ Change detection failed: ${err.message}`);

    // Set failure outputs
    core.setOutput("has-changes", "false");
    core.setOutput("changed-files", "");
    core.setOutput("changed-files-count", "0");

    return {
      success: false,
      changedFiles: [],
      filesChanged: 0,
      error: err.message,
    };
  }
}

// ============================================================================
// CODE STATISTICS
// ============================================================================

/**
 * Computes statistics about code changes between commits
 * Compares current commit against BOTH main branch AND previous commit (if not first)
 * @returns Promise resolving to statistics result
 */
async function checkStats(): Promise<CodeHygieneResult> {
  try {
    core.info("🔍 Computing code statistics...");

    const headRef = env.get("HEAD_REF") ?? env.get("GITHUB_SHA") ?? "HEAD";

    // Ensure we have the base branch fetched
    await git.fetchBranch("main");

    // Compare against main branch
    core.info("📊 Comparing against main branch...");
    const diffVsMain = await git.getDiffStats("origin/main", headRef);
    core.info(`📊 vs Main: ${diffVsMain.filesChanged} files, +${diffVsMain.linesAdded} -${diffVsMain.linesDeleted}`);

    // Try to compare against previous commit (HEAD~1)
    let diffVsPrev: typeof diffVsMain | null = null;
    let isFirstCommit = false;

    try {
      const prevCommitCheck = await exec.getExecOutput("git", ["rev-parse", "--verify", "HEAD~1"], {
        ignoreReturnCode: true,
        silent: true,
      });

      if (prevCommitCheck.exitCode === 0) {
        core.info("📊 Comparing against previous commit...");
        diffVsPrev = await git.getDiffStats("HEAD~1", headRef);
        core.info(`📊 vs Previous: ${diffVsPrev.filesChanged} files, +${diffVsPrev.linesAdded} -${diffVsPrev.linesDeleted}`);
      } else {
        core.info("ℹ️ No previous commit found (first commit in PR)");
        isFirstCommit = true;
      }
    } catch (error) {
      const err = error as Error;
      core.debug(`Could not compare with previous commit: ${err.message}`);
      core.info("ℹ️ Could not compare with previous commit (likely first commit)");
      isFirstCommit = true;
    }

    // Get bundle size comparison
    core.info("📦 Analyzing bundle sizes...");
    let bundleSizeMarkdown = "";

    try {
      const comparisons = await compareBundleSizes(BUNDLE_TARGET_FOLDERS);
      bundleSizeMarkdown = generateBundleSizeMarkdown(comparisons);
    } catch (error) {
      const err = error as Error;
      core.warning(`Could not generate bundle size comparison: ${err.message}`);
      bundleSizeMarkdown = "_Bundle size comparison unavailable_";
    }

    // Set outputs for GitHub Actions (main comparison for primary display)
    core.setOutput("files-changed", diffVsMain.filesChanged.toString());
    core.setOutput("lines-added", diffVsMain.linesAdded.toString());
    core.setOutput("lines-deleted", diffVsMain.linesDeleted.toString());
    core.setOutput("has-changes", diffVsMain.filesChanged > 0 ? "true" : "false");

    // Additional outputs for previous commit comparison
    if (diffVsPrev) {
      core.setOutput("files-changed-vs-prev", diffVsPrev.filesChanged.toString());
      core.setOutput("lines-added-vs-prev", diffVsPrev.linesAdded.toString());
      core.setOutput("lines-deleted-vs-prev", diffVsPrev.linesDeleted.toString());
    }
    core.setOutput("is-first-commit", isFirstCommit ? "true" : "false");
    core.setOutput("bundle-size-markdown", bundleSizeMarkdown);

    core.info("✅ Statistics computation complete");

    return {
      success: true,
      filesChanged: diffVsMain.filesChanged,
      linesAdded: diffVsMain.linesAdded,
      linesDeleted: diffVsMain.linesDeleted,
      bundleSizeMarkdown,
      filesChangedVsMain: diffVsMain.filesChanged,
      linesAddedVsMain: diffVsMain.linesAdded,
      linesDeletedVsMain: diffVsMain.linesDeleted,
      filesChangedVsPrev: diffVsPrev?.filesChanged ?? 0,
      linesAddedVsPrev: diffVsPrev?.linesAdded ?? 0,
      linesDeletedVsPrev: diffVsPrev?.linesDeleted ?? 0,
      isFirstCommit,
    };
  } catch (error) {
    const err = error as Error;
    core.error(`Failed to compute statistics: ${err.message}`);
    return {
      success: false,
      error: err.message,
    };
  }
}

// ============================================================================
// FORMAT CHECKING
// ============================================================================

/**
 * Checks code formatting using Prettier
 * @returns Promise resolving to formatting check result
 */
async function checkFormatting(): Promise<CodeHygieneResult> {
  try {
    core.info("🎨 Checking code formatting...");

    // Run formatting
    const formatResult = await exec.getExecOutput("npm", ["run", "format"], {
      ignoreReturnCode: true,
      silent: false,
    });

    if (formatResult.exitCode !== 0) {
      core.warning("Formatting command exited with non-zero code, but continuing to check diff...");
    }

    // Check if any files were modified
    const diffResult = await exec.getExecOutput("git", ["diff", "--name-only"], {
      ignoreReturnCode: true,
      silent: true,
    });

    const modifiedFiles = diffResult.stdout ? diffResult.stdout.trim().split("\n").filter(Boolean) : [];
    const formattingNeeded = modifiedFiles.length > 0;

    if (formattingNeeded) {
      core.warning(`⚠️ ${modifiedFiles.length} file(s) need formatting:`);
      for (const file of modifiedFiles) {
        core.warning(`  - ${file}`);
      }

      // Show the diff
      await exec.exec("git", ["--no-pager", "diff"], {ignoreReturnCode: true});

      core.setOutput("format-needed", "true");
      core.setOutput("files-needing-format", modifiedFiles.join(","));

      return {
        success: false,
        formattingNeeded: true,
        filesNeedingFormat: modifiedFiles,
        error: `${modifiedFiles.length} file(s) need formatting`,
      };
    }

    core.info("✅ All files are properly formatted");
    core.setOutput("format-needed", "false");
    core.setOutput("files-needing-format", "[]");

    return {
      success: true,
      formattingNeeded: false,
      filesNeedingFormat: [],
    };
  } catch (error) {
    const err = error as Error;
    core.error(`Failed to check formatting: ${err.message}`);
    return {
      success: false,
      formattingNeeded: true,
      error: err.message,
    };
  }
}

// ============================================================================
// LINT CHECKING
// ============================================================================

/**
 * Checks code linting using ESLint
 * @returns Promise resolving to linting check result
 */
async function checkLinting(): Promise<CodeHygieneResult> {
  try {
    core.info("🔍 Running linting checks...");

    // Run linting
    const lintResult = await exec.getExecOutput("npm", ["run", "lint"], {
      ignoreReturnCode: true,
      silent: false,
    });

    const lintOutput = lintResult.stdout + lintResult.stderr;

    if (lintResult.exitCode !== 0) {
      core.warning("❌ Linting checks failed");
      core.setOutput("lint-passed", "false");

      // Truncate output if too long
      const truncatedOutput = lintOutput.length > 50000 ? lintOutput.substring(0, 50000) + "\n\n... (output truncated)" : lintOutput;

      core.setOutput("lint-output", truncatedOutput);

      return {
        success: false,
        lintingErrors: true,
        lintOutput: truncatedOutput,
        error: "Linting errors detected",
      };
    }

    core.info("✅ All linting checks passed");
    core.setOutput("lint-passed", "true");
    core.setOutput("lint-output", "All checks passed!");

    return {
      success: true,
      lintingErrors: false,
      lintOutput,
    };
  } catch (error) {
    const err = error as Error;
    core.error(`Failed to run linting: ${err.message}`);
    return {
      success: false,
      lintingErrors: true,
      error: err.message,
    };
  }
}

// ============================================================================
// PR COMMENT GENERATION
// ============================================================================

/**
 * Formats a commit SHA to short form
 */
function formatCommitSha(sha: string): string {
  return sha.substring(0, 7);
}

/**
 * Gets status emoji for result
 */
function getStatusEmoji(status: string): string {
  switch (status) {
    case "success":
      return "✅";
    case "failure":
      return "❌";
    case "warning":
      return "⚠️";
    default:
      return "❓";
  }
}

/**
 * Generates the unified comprehensive hygiene comment
 * @returns Markdown string for the complete hygiene check report
 */
function generateUnifiedComment(): string {
  // Core status information
  const statsResult = env.get("STATS_RESULT", "unknown") ?? "unknown";
  const formattingResult = env.get("FORMATTING_RESULT", "unknown") ?? "unknown";
  const lintingResult = env.get("LINTING_RESULT", "unknown") ?? "unknown";

  // Primary diff stats
  const filesChanged = env.get("FILES_CHANGED", "0") ?? "0";
  const linesAdded = env.get("LINES_ADDED", "0") ?? "0";
  const linesDeleted = env.get("LINES_DELETED", "0") ?? "0";

  // Previous commit comparison
  const filesChangedVsPrev = env.get("FILES_CHANGED_VS_PREV", "0") ?? "0";
  const linesAddedVsPrev = env.get("LINES_ADDED_VS_PREV", "0") ?? "0";
  const linesDeletedVsPrev = env.get("LINES_DELETED_VS_PREV", "0") ?? "0";
  const isFirstCommit = env.getBoolean("IS_FIRST_COMMIT", false);

  // Formatting
  const formatNeeded = env.getBoolean("FORMAT_NEEDED", false);
  const filesNeedingFormat = env.get("FILES_NEEDING_FORMAT")?.split(",").filter(Boolean) || [];

  // Linting
  const lintPassed = env.getBoolean("LINT_PASSED", false);
  const lintOutput = env.get("LINT_OUTPUT", "") ?? "";

  // Bundle size
  const bundleSizeMarkdown = env.get("BUNDLE_SIZE_MARKDOWN", "_Not available_") ?? "_Not available_";

  // Extended metrics
  const topExtensionsTable = env.get("TOP_EXTENSION_TABLE");
  const topDirectoriesTable = env.get("TOP_DIRECTORY_TABLE");
  const churn = env.get("CHURN");
  const netChange = env.get("NET_CHANGE");

  const commitSha = env.get("GITHUB_SHA", "unknown") ?? "unknown";

  // Overall status calculation (stats considered informational; still included)
  const allPassed = formattingResult === "success" && lintingResult === "success" && statsResult === "success";

  const statusEmoji = allPassed ? "✅" : "⚠️";
  const statusText = allPassed ? "All Checks Passed" : "Issues Found";

  // Use comment builder for cleaner generation
  const builder = createCommentBuilder();

  builder
    .addHeading(`${statusEmoji} Code Hygiene Report: ${statusText}`, 1)
    .addParagraph(`**Commit:** \`${formatCommitSha(commitSha)}\``)
    .addNewline();

  // Summary matrix
  builder
    .addHeading("📋 Check Summary", 2)
    .addTable(
      [
        {header: "Check", align: "left"},
        {header: "Status", align: "center"},
        {header: "Result", align: "left"},
      ],
      [
        [`📊 Statistics`, getStatusEmoji(statsResult), statsResult],
        [`🎨 Formatting`, getStatusEmoji(formattingResult), formattingResult],
        [`🔍 Linting`, getStatusEmoji(lintingResult), lintingResult],
      ],
    )
    .addNewline();

  // Diff summary vs base
  let comment = builder.build();
  comment += `## 📊 Code Changes vs Main Branch\n\n`;
  comment += `**Files Changed:** ${filesChanged}  \n`;
  comment += `**Lines Added:** +${linesAdded}  \n`;
  comment += `**Lines Deleted:** -${linesDeleted}\n\n`;

  // Extended change metrics
  if (churn !== undefined || netChange !== undefined) {
    comment += `### 🔢 Change Metrics\n\n`;
    if (churn !== undefined) {
      comment += `- **Churn (Added + Deleted):** ${churn}\n`;
    }
    if (netChange !== undefined) {
      const netNum = Number(netChange);
      const netSign = netNum > 0 ? "+" : "";
      comment += `- **Net Change (Added - Deleted):** ${netSign}${netChange}\n`;
    }
    comment += `\n`;
  }

  // Previous commit comparison
  if (!isFirstCommit) {
    comment += `<details>\n`;
    comment += `<summary>🔄 Changes Since Previous Commit</summary>\n\n`;
    comment += `**Files Changed:** ${filesChangedVsPrev}  \n`;
    comment += `**Lines Added:** +${linesAddedVsPrev}  \n`;
    comment += `**Lines Deleted:** -${linesDeletedVsPrev}\n\n`;
    comment += `</details>\n\n`;
  }

  // Extension distribution
  if (topExtensionsTable?.includes("|")) {
    comment += `<details>\n`;
    comment += `<summary>🧩 Extension Distribution (Top)</summary>\n\n`;
    comment += `${topExtensionsTable}\n\n`;
    comment += `</details>\n\n`;
  }

  // Directory impact
  if (topDirectoriesTable?.includes("|")) {
    comment += `<details>\n`;
    comment += `<summary>📂 Directory Impact (Top)</summary>\n\n`;
    comment += `${topDirectoriesTable}\n\n`;
    comment += `</details>\n\n`;
  }

  // Bundle Size
  if (bundleSizeMarkdown && bundleSizeMarkdown !== "_Not available_") {
    comment += `<details>\n`;
    comment += `<summary>📦 Bundle Size Analysis</summary>\n\n`;
    comment += `${bundleSizeMarkdown}\n\n`;
    comment += `</details>\n\n`;
  }

  // Formatting
  if (formatNeeded) {
    comment += `## 🎨 Formatting Issues\n\n`;
    comment += `❌ **${filesNeedingFormat.length}** file(s) need formatting:\n\n`;
    if (filesNeedingFormat.length > 0) {
      comment += `<details>\n`;
      comment += `<summary>View files requiring formatting</summary>\n\n`;
      for (const file of filesNeedingFormat) {
        comment += `- \`${file}\`\n`;
      }
      comment += `\n</details>\n\n`;
    }
    comment += `### How to Fix\n\n`;
    comment += `\`\`\`bash\nnpm run format\n\`\`\`\n\n`;
  } else {
    comment += `## 🎨 Formatting\n\n`;
    comment += `✅ All files are properly formatted!\n\n`;
  }

  // Linting
  if (lintPassed) {
    comment += `## 🔍 Linting\n\n`;
    comment += `✅ All linting checks passed!\n\n`;
  } else {
    comment += `## 🔍 Linting Issues\n\n`;
    comment += `❌ ESLint found issues in your code.\n\n`;
    if (lintOutput) {
      const truncatedOutput = lintOutput.length > 50000 ? lintOutput.substring(0, 50000) + "\n\n... (output truncated)" : lintOutput;
      comment += `<details>\n`;
      comment += `<summary>View linting errors</summary>\n\n`;
      comment += `\`\`\`\n${truncatedOutput}\n\`\`\`\n\n`;
      comment += `</details>\n\n`;
    }
    comment += `### How to Fix\n\n`;
    comment += `\`\`\`bash\nnpm run lint\n\`\`\`\n\n`;
  }

  // Footer
  comment += `---\n\n`;
  comment += `_Last updated: ${new Date().toISOString()}_\n`;

  // Add hidden identifier
  comment += `\n<!-- ${HYGIENE_CHECK_COMMENT_IDENTIFIER} -->\n`;

  core.info("Generated unified hygiene comment (extended version)");
  return comment;
}

/**
 * Posts or updates the unified hygiene comment on the PR
 */
async function postHygieneComment(): Promise<CodeHygieneResult> {
  try {
    // Get GitHub token and create helper
    const token = env.getRequired("GITHUB_TOKEN");
    const gh = createGitHubHelper(token);

    // Check if we're in a PR context
    const pr = gh.getPullRequest();
    if (!pr) {
      core.info("Not a PR context - skipping comment");
      return {success: true};
    }

    core.info(`📝 Posting unified hygiene comment to PR #${pr.number}`);

    // Generate comment body
    const commentBody = generateUnifiedComment();

    // Use upsert to create or update comment
    await gh.upsertComment(pr.number, commentBody, HYGIENE_CHECK_COMMENT_IDENTIFIER);

    core.info(`✅ Successfully posted hygiene comment`);
    core.notice(`PR hygiene comment: ${pr.url}`);

    return {success: true};
  } catch (error) {
    const err = error as Error;
    core.error(`❌ Failed to post/update hygiene comment: ${err.message}`);
    core.debug(`Stack trace: ${err.stack ?? "No stack trace available"}`);
    core.warning("Comment posting failed but continuing workflow execution");

    return {success: false, error: err.message};
  }
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

/**
 * Main function that orchestrates code hygiene checks based on mode
 * @returns Promise that resolves when checks complete
 */
export default async function runHygieneCheck(): Promise<void> {
  const mode = env.get("CHECK_MODE", "stats") as CheckMode;

  core.info(`🧹 Running code hygiene check in '${mode}' mode`);

  let result: CodeHygieneResult;

  switch (mode) {
    case "detect": {
      result = await detectChanges();
      break;
    }
    case "stats": {
      result = await checkStats();
      break;
    }
    case "format": {
      result = await checkFormatting();
      break;
    }
    case "lint": {
      result = await checkLinting();
      break;
    }
    case "comment": {
      result = await postHygieneComment();
      break;
    }
    default: {
      core.setFailed(`Unknown check mode: ${mode}`);
      return;
    }
  }

  // Output result as JSON for potential consumption by other steps
  core.setOutput("result", JSON.stringify(result));

  if (result.success) {
    core.info(`✅ ${mode} check completed successfully`);
  } else {
    core.setFailed(result.error || `${mode} check failed`);
  }
}
