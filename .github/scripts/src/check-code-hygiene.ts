/**
 * @fileoverview Performs comprehensive code hygiene checks including statistics, formatting, and linting
 * @module src/check-code-hygiene
 */

import {compareBundleSizes, generateBundleSizeMarkdown} from "../lib/bundle-size-helper.ts";
import {BUNDLE_TARGET_FOLDERS} from "../lib/constants.ts";
import {getEnvVar} from "../lib/env-helper.ts";
import {ensureBranchFetched, getGitDiffStats} from "../lib/git-helper.ts";
import type {ScriptParams} from "../types/index.ts";

/**
 * Check mode for the code hygiene script
 */
export type CheckMode = "stats" | "format" | "lint";

/**
 * Result of code hygiene checks
 */
export interface CodeHygieneResult {
  /** Whether the check passed */
  success: boolean;
  /** Number of files changed (stats mode) */
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
  /** Error message if check failed */
  error?: string;
}

/**
 * Computes statistics about code changes between commits
 * Compares current commit against BOTH main branch AND previous commit (if not first)
 * @param params - Script execution parameters
 * @returns Promise resolving to statistics result
 */
async function checkStats(params: ScriptParams): Promise<CodeHygieneResult> {
  const {core, exec} = params;

  try {
    core.info("🔍 Computing code statistics...");

    const headRef = getEnvVar("HEAD_REF") ?? getEnvVar("GITHUB_SHA") ?? "HEAD";

    // Ensure we have the base branch fetched
    await ensureBranchFetched(params, "main");

    // Compare against main branch
    core.info("📊 Comparing against main branch...");
    const diffVsMain = await getGitDiffStats(params, "origin/main", headRef);
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
        diffVsPrev = await getGitDiffStats(params, "HEAD~1", headRef);
        core.info(`� vs Previous: ${diffVsPrev.filesChanged} files, +${diffVsPrev.linesAdded} -${diffVsPrev.linesDeleted}`);
      } else {
        core.info("ℹ️ No previous commit found (first commit in PR)");
        isFirstCommit = true;
      }
    } catch (error) {
      core.info("ℹ️ Could not compare with previous commit (likely first commit)");
      isFirstCommit = true;
    }

    // Get bundle size comparison
    core.info("📦 Analyzing bundle sizes...");
    let bundleSizeMarkdown = "";

    try {
      const comparisons = await compareBundleSizes(params, BUNDLE_TARGET_FOLDERS);
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

/**
 * Checks code formatting using Prettier
 * @param params - Script execution parameters
 * @returns Promise resolving to formatting check result
 */
async function checkFormatting(params: ScriptParams): Promise<CodeHygieneResult> {
  const {core, exec} = params;

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
      modifiedFiles.forEach((file) => core.warning(`  - ${file}`));

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

/**
 * Checks code linting using ESLint
 * @param params - Script execution parameters
 * @returns Promise resolving to linting check result
 */
async function checkLinting(params: ScriptParams): Promise<CodeHygieneResult> {
  const {core, exec} = params;

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

/**
 * Main function that orchestrates code hygiene checks based on mode
 * @param params - Script execution parameters containing GitHub Actions context
 * @returns Promise that resolves when checks complete
 */
export default async function checkCodeHygiene(params: ScriptParams): Promise<void> {
  const {core} = params;

  const mode = (getEnvVar("CHECK_MODE", "stats") ?? "stats") as CheckMode;

  core.info(`🧹 Running code hygiene check in '${mode}' mode`);

  let result: CodeHygieneResult;

  switch (mode) {
    case "stats": {
      result = await checkStats(params);
      break;
    }
    case "format": {
      result = await checkFormatting(params);
      break;
    }
    case "lint": {
      result = await checkLinting(params);
      break;
    }
    default: {
      core.setFailed(`Unknown check mode: ${mode}`);
      return;
    }
  }

  // Output result as JSON for potential consumption by other steps
  core.setOutput("result", JSON.stringify(result));

  if (!result.success) {
    core.setFailed(result.error || `${mode} check failed`);
  } else {
    core.info(`✅ ${mode} check completed successfully`);
  }
}
