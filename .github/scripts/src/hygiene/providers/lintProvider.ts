/**
 * @fileoverview ESLint lint check provider.
 * @module github/scripts/src/hygiene/providers/lintProvider
 *
 * @remarks
 * Runs `npx eslint . --format json` directly (NOT via `npm run lint`, which uses
 * a custom Piscina-based wrapper that does not support --format json).
 * Parses the structured JSON output to produce LineFinding per ESLint message.
 */

import * as exec from "@actions/exec";
import {filesForEslint} from "../domain/changedFiles.ts";
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
    const scopedFiles = filesForEslint(input);
    const args = scopedFiles === null ? ["eslint", ".", "--format", "json"] : ["eslint", ...scopedFiles, "--format", "json"];
    const result = await exec.getExecOutput("npx", args, {cwd: input.workspaceRoot, ignoreReturnCode: true, silent: true});

    // ESLint JSON output goes to stdout. If parsing fails, treat as zero findings
    // but still surface the raw stderr to the runner via a thrown error so the
    // outcome is "errored" rather than silently passing.
    let parsed: readonly EslintFileResult[];
    try {
      parsed = JSON.parse(result.stdout) as readonly EslintFileResult[];
    } catch (err) {
      throw new Error(`Failed to parse ESLint JSON output: ${(err as Error).message}. ` + `stderr: ${result.stderr.substring(0, 500)}`);
    }

    const {findings, errorCount, warningCount} = parseEslintJson(parsed);
    return {
      payload: {errorCount, warningCount, filesChecked: parsed.length},
      findings,
    };
  },
};
