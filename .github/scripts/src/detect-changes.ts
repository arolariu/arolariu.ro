/**
 * @fileoverview Lightweight change detection for hygiene pipeline gating.
 * Determines if there are any file changes between BASE_REF and HEAD_REF and
 * exposes minimal outputs to allow downstream jobs to short‑circuit.
 */

import {getEnvVar} from "../lib/env-helper.ts";
import {ensureBranchFetched} from "../lib/git-helper.ts";
import type {ScriptParams} from "../types/index.ts";

interface ChangeDetectionResult {
  success: boolean;
  changedFiles: string[];
  error?: string;
}

function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

export default async function detectChanges(params: ScriptParams): Promise<void> {
  const {core, exec} = params;

  const baseRef = getEnvVar("BASE_REF") || "origin/main";
  const headRef = getEnvVar("HEAD_REF") || getEnvVar("GITHUB_SHA") || "HEAD";

  core.info(`🔍 Performing change detection between '${baseRef}' and '${headRef}'`);

  let result: ChangeDetectionResult; // Will assign within try/catch blocks

  try {
    // Ensure base branch is fetched if it's a branch ref (helps with shallow clones)
    if (baseRef === "origin/main" || baseRef.endsWith("main")) {
      await ensureBranchFetched(params, "main");
    }

    const diffArgs = ["diff", "--name-only", `${baseRef}`, `${headRef}`];
    const diffOutput = await exec.getExecOutput("git", diffArgs, {ignoreReturnCode: true, silent: true});

    if (diffOutput.exitCode !== 0) {
      core.warning(`git diff exited with code ${diffOutput.exitCode}; output may be incomplete.`);
    }

    const files = diffOutput.stdout
      .split("\n")
      .map((f) => f.trim())
      .filter(Boolean);

    const changedFiles = unique(files);
    const hasChanges = changedFiles.length > 0;

    core.setOutput("has-changes", hasChanges ? "true" : "false");
    core.setOutput("changed-files", changedFiles.join(","));
    core.setOutput("changed-files-count", changedFiles.length.toString());
    core.setOutput("result", JSON.stringify({success: true, changedFiles} satisfies ChangeDetectionResult));

    result = {success: true, changedFiles};
    core.info(`✅ Change detection complete: ${changedFiles.length} file(s) changed.`);
  } catch (error) {
    const err = error as Error;
    core.setOutput("has-changes", "false");
    core.setOutput("changed-files", "");
    core.setOutput("changed-files-count", "0");
    core.setOutput("result", JSON.stringify({success: false, changedFiles: [], error: err.message} satisfies ChangeDetectionResult));
    core.error(`❌ Change detection failed: ${err.message}`);
    result = {success: false, changedFiles: [], error: err.message};
  }

  if (!result.success) {
    core.warning("Proceeding despite change detection failure – downstream jobs may run.");
  }
}
