/**
 * @fileoverview Format check module for hygiene pipeline
 * @module hygiene/checks/formatCheck
 *
 * Runs Prettier formatting and detects files that need changes.
 * Produces a `format-result.json` artifact with the check result.
 *
 * @example
 * ```typescript
 * import { runFormatCheck } from './formatCheck.ts';
 * const result = await runFormatCheck();
 * // Writes format-result.json to artifacts directory
 * ```
 */

import * as core from "@actions/core";
import * as exec from "@actions/exec";
import * as fs from "node:fs/promises";
import * as path from "node:path";

import {type HygieneCheckResult, createErrorResult, createFailureResult, createSuccessResult} from "../types.ts";

/**
 * Artifact output directory (relative to workspace root)
 */
const ARTIFACT_DIR = "artifacts/hygiene";

/**
 * Artifact filename for format check results
 */
const ARTIFACT_FILENAME = "format-result.json";

/**
 * Runs the format check and produces a result artifact
 *
 * @returns The format check result
 */
export async function runFormatCheck(): Promise<HygieneCheckResult> {
  const startTime = performance.now();

  try {
    core.info("🎨 Starting format check...");

    // Run prettier formatting
    core.info("Running npm run format...");
    const formatResult = await exec.getExecOutput("npm", ["run", "format"], {
      ignoreReturnCode: true,
      silent: false,
    });

    if (formatResult.exitCode !== 0) {
      core.warning(`Prettier exited with code ${formatResult.exitCode}, checking for changes...`);
    }

    // Check for modified files using git diff
    core.info("Checking for modified files...");
    const diffResult = await exec.getExecOutput("git", ["diff", "--name-only"], {
      ignoreReturnCode: true,
      silent: true,
    });

    const modifiedFiles = diffResult.stdout
      .trim()
      .split("\n")
      .filter((line) => line.length > 0);

    const duration = Math.round(performance.now() - startTime);

    let result: HygieneCheckResult;

    if (modifiedFiles.length > 0) {
      core.warning(`❌ ${modifiedFiles.length} file(s) need formatting`);

      // Log the files that need formatting
      for (const file of modifiedFiles) {
        core.warning(`  - ${file}`);
      }

      result = createFailureResult("format", `${modifiedFiles.length} file(s) need formatting`, duration, {
        filesNeedingFormat: modifiedFiles,
      });

      // Set GitHub Actions output for backward compatibility
      core.setOutput("format-needed", "true");
      core.setOutput("files-needing-format", modifiedFiles.join(","));
    } else {
      core.info("✅ All files are properly formatted");

      result = createSuccessResult("format", "All files are properly formatted", duration, {
        filesNeedingFormat: [],
      });

      core.setOutput("format-needed", "false");
      core.setOutput("files-needing-format", "");
    }

    // Write artifact
    await writeArtifact(result);

    return result;
  } catch (error) {
    const err = error as Error;
    const duration = Math.round(performance.now() - startTime);

    core.error(`❌ Format check failed: ${err.message}`);

    const result = createErrorResult("format", err, duration);
    await writeArtifact(result);

    return result;
  }
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
export default runFormatCheck;
