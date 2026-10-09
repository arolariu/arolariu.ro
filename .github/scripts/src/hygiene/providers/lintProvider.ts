/**
 * @fileoverview ESLint lint check provider.
 * @module github/scripts/src/hygiene/providers/lintProvider
 *
 * @remarks
 * Runs `npx eslint <scope> --format json` directly (NOT via `npm run lint`, which uses
 * a custom Piscina-based wrapper that does not support --format json).
 * Isolates typed project state in sequential processes and parses their combined JSON output.
 */

import * as exec from "@actions/exec";
import * as path from "node:path";
import {filesForEslint, filterExistingFiles} from "../domain/changedFiles.ts";
import type {CheckProvider, ProviderRunInput, ProviderRunOutput, Schema} from "../domain/provider.ts";
import type {Finding, LineFinding, Severity} from "../domain/types.ts";

export interface EslintMessage {
  readonly line: number;
  readonly column: number;
  readonly endLine?: number;
  readonly endColumn?: number;
  readonly severity: 0 | 1 | 2;
  readonly message: string;
  readonly ruleId: string | null;
}

export interface EslintFileResult {
  readonly filePath: string;
  readonly errorCount: number;
  readonly warningCount: number;
  readonly messages: readonly EslintMessage[];
}

export interface LintPayload {
  readonly errorCount: number;
  readonly warningCount: number;
  readonly filesChecked: number;
}

const schema: Schema<LintPayload> = {
  parse(data: unknown): LintPayload {
    if (typeof data !== "object" || data === null) throw new Error("payload not object");
    const r = data as Record<string, unknown>;
    if (typeof r["errorCount"] !== "number") throw new Error("errorCount");
    if (typeof r["warningCount"] !== "number") throw new Error("warningCount");
    if (typeof r["filesChecked"] !== "number") throw new Error("filesChecked");
    return {errorCount: r["errorCount"], warningCount: r["warningCount"], filesChecked: r["filesChecked"]};
  },
};

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
  id: "lint",
  name: "ESLint",
  icon: "🔍",
  defaultGate: {kind: "blocking", blockOn: "error"},
  payloadSchema: schema,
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

    const projectPrefixes = LINT_PROJECTS.map((project) => `${project.replace(/\\/g, "/")}/`);
    const groups =
      scopedFiles === null
        ? [...LINT_PROJECTS.map((project) => [project]), [".", ...projectPrefixes.flatMap((prefix) => ["--ignore-pattern", `${prefix}**`])]]
        : [
            ...projectPrefixes.map((prefix) => scopedFiles.filter((file) => file.startsWith(prefix))),
            scopedFiles.filter((file) => !projectPrefixes.some((prefix) => file.startsWith(prefix))),
          ].filter((group) => group.length > 0);
    const parsed: EslintFileResult[] = [];
    for (const group of groups) {
      const result = await exec.getExecOutput("npx", ["eslint", ...group, "--format", "json"], {
        cwd: input.workspaceRoot,
        ignoreReturnCode: true,
        silent: true,
        // Release typed projectService/compiler state between projects instead of retaining the whole monorepo.
        env: {...process.env, NODE_OPTIONS: `${process.env["NODE_OPTIONS"] ?? ""} --max-old-space-size=6144`.trim()},
      });

      if (result.exitCode > 1) {
        throw new Error(`ESLint exited with code ${result.exitCode} for ${group[0]}. stderr: ${result.stderr.slice(-4000)}`);
      }

      try {
        parsed.push(...(JSON.parse(result.stdout) as EslintFileResult[]));
      } catch (err) {
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
    };
  },
};
