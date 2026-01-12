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
 * Parsed ESLint JSON output message
 */
interface ESLintMessage {
  ruleId: string | null;
  severity: 1 | 2; // 1 = warning, 2 = error
  message: string;
  line: number;
  column: number;
}

/**
 * Parsed ESLint JSON output file result
 */
interface ESLintFileResult {
  filePath: string;
  messages: ESLintMessage[];
  errorCount: number;
  warningCount: number;
}

/**
 * Runs the lint check and produces a result artifact
 *
 * @returns The lint check result
 */
export async function runLintCheck(): Promise<HygieneCheckResult> {
  const startTime = performance.now();

  try {
    core.info("🔍 Starting lint check...");

    // Run ESLint with JSON format for structured output
    core.info("Running npm run lint...");
    const lintResult = await exec.getExecOutput("npm", ["run", "lint", "--", "--format", "json"], {
      ignoreReturnCode: true,
      silent: true,
    });

    const duration = Math.round(performance.now() - startTime);
    const rawOutput =
      lintResult.stdout.length > MAX_RAW_OUTPUT_LENGTH
        ? lintResult.stdout.substring(0, MAX_RAW_OUTPUT_LENGTH) + "\n\n... (output truncated)"
        : lintResult.stdout;

    // Try to parse JSON output
    let eslintResults: ESLintFileResult[] = [];
    let parseError = false;

    try {
      // ESLint JSON output might be wrapped in npm output, try to extract it
      const jsonMatch = lintResult.stdout.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        eslintResults = JSON.parse(jsonMatch[0]) as ESLintFileResult[];
      }
    } catch {
      core.warning("Could not parse ESLint JSON output, using text analysis");
      parseError = true;
    }

    let result: HygieneCheckResult;

    if (lintResult.exitCode === 0) {
      core.info("✅ All lint checks passed");

      result = createSuccessResult("lint", "All lint checks passed", duration, {
        lintIssues: [],
        errorCount: 0,
        warningCount: 0,
      });

      core.setOutput("lint-passed", "true");
      core.setOutput("lint-output", "All checks passed!");
    } else {
      // Calculate totals from parsed results
      let totalErrors = 0;
      let totalWarnings = 0;
      const issues: FileIssue[] = [];

      if (!parseError) {
        for (const file of eslintResults) {
          totalErrors += file.errorCount;
          totalWarnings += file.warningCount;

          for (const msg of file.messages) {
            issues.push({
              path: file.filePath,
              line: msg.line,
              column: msg.column,
              severity: msg.severity === 2 ? "error" : "warning",
              message: msg.message,
              ruleId: msg.ruleId ?? undefined,
            });
          }
        }
      } else {
        // Fallback: count errors/warnings from exit code
        totalErrors = lintResult.exitCode !== 0 ? 1 : 0;
      }

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
