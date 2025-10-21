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
 * @param params - Script execution parameters
 * @returns Promise resolving to statistics result
 */
async function checkStats(params: ScriptParams): Promise<CodeHygieneResult> {
  const {core} = params;

  try {
    core.info("🔍 Computing code statistics...");

    // Determine base and head commits
    const baseRef = getEnvVar("BASE_REF") ?? getEnvVar("GITHUB_BASE_REF") ?? "origin/main";
    const headRef = getEnvVar("HEAD_REF") ?? getEnvVar("GITHUB_SHA") ?? "HEAD";

    core.info(`Comparing ${baseRef}...${headRef}`);

    // Ensure we have the base branch fetched
    await ensureBranchFetched(params, "main");

    // Get diff stats using reusable helper
    const diffStats = await getGitDiffStats(params, baseRef, headRef);

    core.info(`📁 Files changed: ${diffStats.filesChanged}`);
    core.info(`📈 Lines: +${diffStats.linesAdded} -${diffStats.linesDeleted}`);

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

    // Set outputs for GitHub Actions
    core.setOutput("files-changed", diffStats.filesChanged.toString());
    core.setOutput("lines-added", diffStats.linesAdded.toString());
    core.setOutput("lines-deleted", diffStats.linesDeleted.toString());
    core.setOutput("has-changes", diffStats.filesChanged > 0 ? "true" : "false");

    core.info("✅ Statistics computation complete");

    return {
      success: true,
      filesChanged: diffStats.filesChanged,
      linesAdded: diffStats.linesAdded,
      linesDeleted: diffStats.linesDeleted,
      bundleSizeMarkdown,
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

      return {
        success: false,
        lintingErrors: true,
        lintOutput: truncatedOutput,
        error: "Linting errors detected",
      };
    }

    core.info("✅ All linting checks passed");
    core.setOutput("lint-passed", "true");

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
