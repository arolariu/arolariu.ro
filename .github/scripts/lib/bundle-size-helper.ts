/**
 * @fileoverview Bundle size comparison utilities for build artifacts
 * @module lib/bundle-size-helper
 */

import prettyBytes from "pretty-bytes";
import type {FileComparisonItem, ScriptParams} from "../types/index.ts";
import {getFileSizesFromGit} from "./git-helper.ts";

/**
 * Result of comparing bundle sizes between branches
 */
export interface BundleSizeComparison {
  /** Folder path being analyzed */
  folder: string;
  /** Total size in bytes from main branch */
  mainTotalSize: number;
  /** Total size in bytes from preview branch */
  previewTotalSize: number;
  /** Size difference (preview - main) */
  totalDiff: number;
  /** List of files that changed between branches */
  filesChanged: FileComparisonItem[];
  /** Whether any changes were detected */
  hasChanges: boolean;
}

/**
 * Fetches and compares file sizes between main and preview branches for specified folders
 * @param params - Script execution parameters containing exec utilities
 * @param targetFolders - Array of folder paths to analyze (e.g., ['.next', 'bin/Release/publish'])
 * @returns Promise resolving to array of comparison results, one per folder
 * @throws {Error} When git operations fail or folder access is denied
 * @example
 * ```typescript
 * const params = {exec: getExecOutput, core, github};
 * const folders = ['sites/arolariu.ro/.next'];
 * const results = await compareBundleSizes(params, folders);
 * results.forEach(r => console.log(`${r.folder}: ${r.totalDiff} bytes`));
 * ```
 */
export async function compareBundleSizes(params: ScriptParams, targetFolders: string[]): Promise<BundleSizeComparison[]> {
  const {exec, core} = params;
  const results: BundleSizeComparison[] = [];

  try {
    core.info(`🔍 Starting bundle size comparison for ${targetFolders.length} folder(s)`);

    // Fetch main branch
    core.debug("Fetching main branch for comparison...");
    await exec.getExecOutput("git fetch origin main:refs/remotes/origin/main --depth=1 --no-tags --quiet");
    core.debug("✓ Main branch fetched successfully");

    // Get file sizes from both branches
    core.info("Retrieving file sizes from main branch...");
    const mainBranchFiles = await getFileSizesFromGit(params, "refs/remotes/origin/main", targetFolders);
    core.debug(`Found ${Object.keys(mainBranchFiles).length} files in main branch`);

    core.info("Retrieving file sizes from preview branch...");
    const previewBranchFiles = await getFileSizesFromGit(params, "HEAD", targetFolders);
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
 * Compares file sizes for a specific folder between main and preview branches
 * @param folder - Folder path to analyze (e.g., 'sites/arolariu.ro/.next')
 * @param mainBranchFiles - Record of file paths to sizes from main branch
 * @param previewBranchFiles - Record of file paths to sizes from preview branch
 * @returns Comparison result containing total sizes, differences, and changed files
 * @example
 * ```typescript
 * const mainFiles = {'sites/app.js': 1024, 'sites/vendor.js': 2048};
 * const previewFiles = {'sites/app.js': 1100, 'sites/vendor.js': 2048};
 * const result = compareFolderSizes('sites', mainFiles, previewFiles);
 * // result.totalDiff === 76 (1100 - 1024)
 * ```
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
  Object.keys(mainBranchFiles).forEach((p) => {
    if (p.startsWith(folder + "/")) relevantFilePaths.add(p);
  });
  Object.keys(previewBranchFiles).forEach((p) => {
    if (p.startsWith(folder + "/")) relevantFilePaths.add(p);
  });

  // Compare each file
  for (const path of relevantFilePaths) {
    const mainSize = mainBranchFiles[path];
    const previewSize = previewBranchFiles[path];

    if (mainSize !== undefined) folderMainTotalSize += mainSize;
    if (previewSize !== undefined) folderPreviewTotalSize += previewSize;

    if (mainSize === undefined && previewSize !== undefined) {
      // File added
      const diff = previewSize;
      filesInFolder.push({path, mainSize: 0, previewSize, diff, status: "Added"});
    } else if (mainSize !== undefined && previewSize === undefined) {
      // File removed
      const diff = -mainSize;
      filesInFolder.push({path, mainSize, previewSize: 0, diff, status: "Removed"});
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
 * Generates a markdown section summarizing all bundle size comparisons
 * @param comparisons - Array of bundle size comparison results
 * @returns Formatted markdown string with expandable folder sections
 * @example
 * ```typescript
 * const comparisons = [
 *   {folder: '.next', mainTotalSize: 10000, previewTotalSize: 11000, totalDiff: 1000, filesChanged: [], hasChanges: true}
 * ];
 * const markdown = generateBundleSizeMarkdown(comparisons);
 * // Returns markdown with <details> sections for each folder
 * ```
 */
export function generateBundleSizeMarkdown(comparisons: BundleSizeComparison[]): string {
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
 * Generates a markdown collapsible section for a single folder's size comparison
 * @param comparison - Bundle size comparison data for one folder
 * @returns Markdown string with <details> element containing folder analysis
 * @example
 * ```typescript
 * const comp = {
 *   folder: 'bin/Release',
 *   mainTotalSize: 5000000,
 *   previewTotalSize: 5100000,
 *   totalDiff: 100000,
 *   filesChanged: [{path: 'app.dll', mainSize: 1000, previewSize: 1100, diff: 100, status: 'Modified'}],
 *   hasChanges: true
 * };
 * const section = generateFolderComparisonMarkdown(comp);
 * ```
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
  const diffSign = totalDiff > 0 ? "+" : totalDiff < 0 ? "-" : "";
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
 * Generates a markdown table showing individual file changes within a folder
 * @param folder - Folder path for calculating relative paths
 * @param filesChanged - Array of file comparison items with size differences
 * @returns Markdown table string with file-level change details
 * @example
 * ```typescript
 * const changes = [
 *   {path: 'sites/main.js', mainSize: 1024, previewSize: 1100, diff: 76, status: 'Modified'}
 * ];
 * const table = generateFileChangesTable('sites', changes);
 * // Returns markdown table with columns: File Path, Main, Preview, Difference, Status
 * ```
 */
function generateFileChangesTable(folder: string, filesChanged: FileComparisonItem[]): string {
  let table = `| File Path (relative to folder) | Main Branch | Preview Branch | Difference | Status   |\n`;
  table += `|--------------------------------|-------------|----------------|------------|----------|\n`;

  filesChanged.sort((a, b) => a.path.localeCompare(b.path));

  for (const item of filesChanged) {
    const itemDiffSign = item.diff > 0 ? "+" : item.diff < 0 ? "-" : "";
    const itemDiffDisplay = item.diff === 0 ? "---" : `${itemDiffSign}${prettyBytes(Math.abs(item.diff))}`;
    const relativePath = item.path.substring(folder.length + 1);

    table += `| \`${relativePath}\` | ${prettyBytes(item.mainSize ?? 0)} | ${prettyBytes(
      item.previewSize ?? 0,
    )} | ${itemDiffDisplay} | ${item.status} |\n`;
  }

  table += `\n`;
  return table;
}
