/**
 * @fileoverview Lint check module for hygiene pipeline.
 * @module github/scripts/src/hygiene/checks/lintCheck
 *
 * @remarks
 * Runs ESLint and produces a structured result artifact.
 * Captures error/warning counts and individual file issues.
 *
 * @example
 * ```typescript
 * import { runLintCheck } from './lintCheck.ts';
 * const result = await runLintCheck();
 * // Writes lint-result.json to artifacts directory
 * ```
 */

import * as core from "@actions/core";
import * as exec from "@actions/exec";
import * as fs from "node:fs/promises";
import * as path from "node:path";

import {type FileIssue, type HygieneCheckResult, createErrorResult, createFailureResult, createSuccessResult} from "../types.ts";

/**
 * Artifact output directory (relative to workspace root)
 */
const ARTIFACT_DIR = "artifacts/hygiene";

/**
 * Artifact filename for lint check results
 */
const ARTIFACT_FILENAME = "lint-result.json";

/**
 * Maximum length for raw output to prevent huge artifacts
 */
const MAX_RAW_OUTPUT_LENGTH = 50_000;

/**
 * Runs the lint check and produces a result artifact
 *
 * @returns The lint check result
 */
export async function runLintCheck(): Promise<HygieneCheckResult> {
  const startTime = performance.now();

  try {
    core.info("🔍 Starting lint check...");

    // Run the monorepo's custom lint script (Piscina-based parallel ESLint)
    // Do NOT pass --format json — the custom script doesn't support it
    core.info("Running npm run lint...");
    const lintResult = await exec.getExecOutput("npm", ["run", "lint"], {
      ignoreReturnCode: true,
      silent: true,
    });

    const duration = Math.round(performance.now() - startTime);
    const combinedOutput = lintResult.stdout + "\n" + lintResult.stderr;
    const rawOutput =
      combinedOutput.length > MAX_RAW_OUTPUT_LENGTH
        ? combinedOutput.substring(0, MAX_RAW_OUTPUT_LENGTH) + "\n\n... (output truncated)"
        : combinedOutput;

    // Parse error/warning counts from the lint script's summary line:
    // "📊 Summary: N error(s), M warning(s)"
    let totalErrors = 0;
    let totalWarnings = 0;
    const issues: FileIssue[] = [];

    const summaryMatch = combinedOutput.match(/Summary:\s*(\d+)\s*error\(s\),\s*(\d+)\s*warning\(s\)/);
    if (summaryMatch) {
      totalErrors = parseInt(summaryMatch[1] ?? "0", 10);
      totalWarnings = parseInt(summaryMatch[2] ?? "0", 10);
    }

    // Also parse individual ESLint stylish-format issues for the file list
    // Pattern: "/path/to/file.ts\n  line:col  error  message  rule-name"
    const issuePattern = /^\s+(\d+):(\d+)\s+(error|warning)\s+(.+?)\s{2,}(\S+)\s*$/gm;
    let currentFile = "";
    for (const line of combinedOutput.split("\n")) {
      // Detect file path lines (absolute paths or relative paths without leading whitespace)
      const fileLine = line.match(/^([/\\]|[A-Za-z]:\\|\S+\.[jt]sx?)/);
      if (fileLine && !line.startsWith(" ")) {
        currentFile = line.trim();
        continue;
      }
      const match = line.match(/^\s+(\d+):(\d+)\s+(error|warning)\s+(.+?)\s{2,}(\S+)\s*$/);
      if (match && currentFile) {
        issues.push({
          path: currentFile,
          line: parseInt(match[1] ?? "0", 10),
          column: parseInt(match[2] ?? "0", 10),
          severity: match[3] === "error" ? "error" : "warning",
          message: match[4]?.trim() ?? "",
          ruleId: match[5] ?? undefined,
        });
      }
    }

    let result: HygieneCheckResult;

    if (lintResult.exitCode === 0 && totalErrors === 0) {
      core.info("✅ All lint checks passed");

      result = createSuccessResult("lint", "All lint checks passed", duration, {
        lintIssues: [],
        errorCount: 0,
        warningCount: totalWarnings,
      });

      core.setOutput("lint-passed", "true");
      core.setOutput("lint-output", "All checks passed!");
    } else {
      core.warning(`❌ Lint check failed: ${totalErrors} error(s), ${totalWarnings} warning(s)`);

      result = createFailureResult("lint", `${totalErrors} error(s), ${totalWarnings} warning(s)`, duration, {
        lintIssues: issues,
        errorCount: totalErrors,
        warningCount: totalWarnings,
        rawOutput,
      });

      core.setOutput("lint-passed", "false");
      core.setOutput("lint-output", rawOutput);
    }

    // Write artifact
    await writeArtifact(result);

    return result;
  } catch (error) {
    const err = error as Error;
    const duration = Math.round(performance.now() - startTime);

    core.error(`❌ Lint check failed: ${err.message}`);

    const result = createErrorResult("lint", err, duration);
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
export default runLintCheck;
