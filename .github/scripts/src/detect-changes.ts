/**
 * @fileoverview Lightweight change detection for hygiene pipeline gating.
 * Determines if there are any file changes between BASE_REF and HEAD_REF and
 * exposes minimal outputs to allow downstream jobs to short‑circuit.
 */

import * as core from "@actions/core";
import { env, git } from "../helpers/index.ts";

/**
 * Change detection result
 */
interface ChangeDetectionResult {
  /** Whether detection was successful */
  success: boolean;
  /** List of changed file paths */
  changedFiles: string[];
  /** Error message if detection failed */
  error?: string;
}

/**
 * Detects file changes between two Git references
 * Uses new helper architecture for cleaner, more maintainable code
 */
export default async function detectChanges(): Promise<void> {
  // Get Git references from environment
  const baseRef = env.get("BASE_REF", "origin/main");
  const headRef = env.get("HEAD_REF") ?? env.get("GITHUB_SHA") ?? "HEAD";

  core.info(`🔍 Performing change detection between '${baseRef}' and '${headRef}'`);

  let result: ChangeDetectionResult;

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
    core.setOutput("result", JSON.stringify({
      success: true,
      changedFiles
    } satisfies ChangeDetectionResult));

    result = { success: true, changedFiles };
    core.info(`✅ Change detection complete: ${changedFiles.length} file(s) changed.`);
  } catch (error) {
    const err = error as Error;
    
    // Set failure outputs
    core.setOutput("has-changes", "false");
    core.setOutput("changed-files", "");
    core.setOutput("changed-files-count", "0");
    core.setOutput("result", JSON.stringify({
      success: false,
      changedFiles: [],
      error: err.message
    } satisfies ChangeDetectionResult));
    
    core.error(`❌ Change detection failed: ${err.message}`);
    result = { success: false, changedFiles: [], error: err.message };
  }

  if (!result.success) {
    core.warning("Proceeding despite change detection failure – downstream jobs may run.");
  }
}
