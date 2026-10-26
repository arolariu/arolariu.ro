/**
 * @fileoverview ESLint lint check provider.
 * @module github/scripts/src/hygiene/providers/lintProvider
 *
 * @remarks
 * Runs `npx eslint <scope> --format json` directly (NOT via `npm run lint`, which uses
 * a custom Piscina-based wrapper that does not support --format json).
 * Isolates typed project state in sequential processes and parses their combined JSON output.
 */

import * as exec from "../../../helpers/sdk/exec.ts";
import {CommandExecutionError} from "../../../helpers/exec/index.ts";
import {decodeEslintReport, type EslintFileResult} from "../../../helpers/reports/eslint.ts";
import * as path from "node:path";
import {filesForEslint, filterExistingFiles} from "../domain/changedFiles.ts";
import type {CheckProvider, ProviderRunInput, ProviderRunOutput} from "../domain/provider.ts";
import type {Finding, LineFinding, Severity} from "../domain/types.ts";
import {lintPayloadSchema, type LintPayload} from "../../../lib/hygiene/payloads.ts";
import {providerDescriptor} from "../../../lib/hygiene/registry.ts";
export type {LintPayload} from "../../../lib/hygiene/payloads.ts";
export type {EslintMessage, EslintFileResult} from "../../../helpers/reports/eslint.ts";

function eslintSeverityToFinding(s: 0 | 1 | 2): Severity {
  if (s === 2) return "error";
  if (s === 1) return "warning";
  return "info";
}

const LINT_PROJECTS = [
  path.join("sites", "arolariu.ro"),
  path.join("packages", "components"),
  path.join("sites", "cv.arolariu.ro"),
  path.join("sites", "status.arolariu.ro"),
] as const;

export function parseEslintJson(results: readonly EslintFileResult[]): {
  findings: Finding[];
  errorCount: number;
  warningCount: number;
} {
  const findings: Finding[] = [];
  let errorCount = 0;
  let warningCount = 0;
  for (const file of results) {
    errorCount += file.errorCount;
    warningCount += file.warningCount;
    for (const msg of file.messages) {
      const f: LineFinding = {
        kind: "line",
        severity: eslintSeverityToFinding(msg.severity),
        file: file.filePath,
        line: msg.line,
        column: msg.column,
        message: msg.message,
        ...(msg.endLine !== undefined ? {endLine: msg.endLine} : {}),
        ...(msg.endColumn !== undefined ? {endColumn: msg.endColumn} : {}),
        ...(msg.ruleId ? {ruleId: msg.ruleId} : {}),
      };
      findings.push(f);
    }
  }
  return {findings, errorCount, warningCount};
}

export const lintProvider: CheckProvider<LintPayload> = {
  ...providerDescriptor("lint"),
  payloadSchema: lintPayloadSchema,
  applicableTo: (input) => {
    const files = filesForEslint(input);
    return files === null || files.length > 0;
  },
  async run(input: ProviderRunInput): Promise<ProviderRunOutput<LintPayload>> {
    const candidateFiles = filesForEslint(input);
    const scopedFiles = candidateFiles === null ? null : await filterExistingFiles(input.workspaceRoot, candidateFiles);
    if (scopedFiles !== null && scopedFiles.length === 0) {
      return {
        payload: {errorCount: 0, warningCount: 0, filesChecked: 0},
        findings: [],
      };
    }

    const nodeOptions = input.env["NODE_OPTIONS"] ?? "";
    const env = {
      ...input.env,
      NODE_OPTIONS: /--max[-_]old[-_]space[-_]size(?:=|\s)/u.test(nodeOptions)
        ? nodeOptions
        : `${nodeOptions} --max-old-space-size=8192`.trim(),
    };
    const projectPrefixes = LINT_PROJECTS.map((project) => `${project.replace(/\\/g, "/")}/`);
    const groups =
      scopedFiles === null
        ? [...LINT_PROJECTS.map((project) => [project]), [".", ...projectPrefixes.flatMap((prefix) => ["--ignore-pattern", `${prefix}**`])]]
        : [
            ...projectPrefixes.map((prefix) => scopedFiles.filter((file) => file.startsWith(prefix))),
            scopedFiles.filter((file) => !projectPrefixes.some((prefix) => file.startsWith(prefix))),
          ].filter((group) => group.length > 0);
    const parsed: EslintFileResult[] = [];
    let failed = false;
    for (const group of groups) {
      const result = await exec.getExecOutput("npx", ["eslint", ...group, "--format", "json"], {
        cwd: input.workspaceRoot,
        ignoreReturnCode: true,
        silent: true,
        // Release typed projectService/compiler state between projects instead of retaining the whole monorepo.
        env,
      });

      if (result.exitCode > 1) throw new CommandExecutionError("ESLint", result);

      try {
        const value: unknown = JSON.parse(result.stdout);
        const files = decodeEslintReport(value);
        if (result.exitCode !== 0 && !files.some((file) => file.errorCount > 0)) throw new CommandExecutionError("ESLint", result);
        parsed.push(...files);
        failed ||= result.exitCode !== 0;
      } catch (err) {
        if (err instanceof CommandExecutionError) throw err;
        throw new Error(
          `Failed to parse ESLint JSON output for ${group[0]} (exit ${result.exitCode}): ${(err as Error).message}. `
            + `stderr: ${result.stderr.slice(-4000)}`,
        );
      }
    }

    const {findings, errorCount, warningCount} = parseEslintJson(parsed);
    return {
      payload: {errorCount, warningCount, filesChecked: parsed.length},
      findings,
      executionStatus: failed ? "failed" : "passed",
    };
  },
};
