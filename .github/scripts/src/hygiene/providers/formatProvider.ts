/**
 * @fileoverview Prettier format check provider.
 * @module github/scripts/src/hygiene/providers/formatProvider
 *
 * @remarks
 * Runs `npx prettier --check .` (NOT `npm run format` which writes files).
 * Emits one FileFinding per unformatted file.
 */

import * as exec from "@actions/exec";
import {filesForPrettier, filterExistingFiles} from "../domain/changedFiles.ts";
import type {CheckProvider, ProviderRunInput, ProviderRunOutput, Schema} from "../domain/provider.ts";
import type {FileFinding, Finding} from "../domain/types.ts";

export interface FormatPayload {
  readonly unformattedCount: number;
  readonly unformattedFiles: readonly string[];
}

const schema: Schema<FormatPayload> = {
  parse(data: unknown): FormatPayload {
    if (typeof data !== "object" || data === null) throw new Error("payload not object");
    const rec = data as Record<string, unknown>;
    if (typeof rec["unformattedCount"] !== "number") throw new Error("unformattedCount not number");
    if (!Array.isArray(rec["unformattedFiles"])) throw new Error("unformattedFiles not array");
    const files = (rec["unformattedFiles"] as unknown[]).map((f) => {
      if (typeof f !== "string") throw new Error("file not string");
      return f;
    });
    return {unformattedCount: rec["unformattedCount"], unformattedFiles: files};
  },
};

/**
 * Parses prettier --check output for unformatted file paths.
 * Prettier v3 prints `[warn] <path>` for each unformatted file, followed by a
 * summary line `[warn] Code style issues found in N files.`.
 */
export function parsePrettierCheckOutput(output: string): string[] {
  const files: string[] = [];
  for (const line of output.split("\n")) {
    const m = line.match(/^\[warn\]\s+(.+)$/);
    if (!m || !m[1]) continue;
    const candidate = m[1].trim();
    // Skip summary line.
    if (/^Code style issues found/.test(candidate)) continue;
    if (/^All matched files/.test(candidate)) continue;
    files.push(candidate);
  }
  return files;
}

export const formatProvider: CheckProvider<FormatPayload> = {
  id: "format",
  name: "Prettier",
  icon: "🎨",
  defaultGate: {kind: "blocking", blockOn: "warning"},
  payloadSchema: schema,
  applicableTo: (input) => {
    const files = filesForPrettier(input);
    return files === null || files.length > 0;
  },
  async run(input: ProviderRunInput): Promise<ProviderRunOutput<FormatPayload>> {
    const candidateFiles = filesForPrettier(input);
    const scopedFiles = candidateFiles === null ? null : await filterExistingFiles(input.workspaceRoot, candidateFiles);
    if (scopedFiles !== null && scopedFiles.length === 0) {
      return {
        payload: {unformattedCount: 0, unformattedFiles: []},
        findings: [],
      };
    }

    const args = scopedFiles === null ? ["prettier", "--check", "."] : ["prettier", "--check", ...scopedFiles];
    const result = await exec.getExecOutput("npx", args, {cwd: input.workspaceRoot, ignoreReturnCode: true, silent: true});

    const combined = result.stdout + "\n" + result.stderr;
    const files = parsePrettierCheckOutput(combined);

    const findings: Finding[] = files.map<FileFinding>((file) => ({
      kind: "file",
      severity: "warning",
      file,
      message: "File is not formatted according to Prettier rules",
      ruleId: "prettier/format",
    }));

    return {
      payload: {unformattedCount: files.length, unformattedFiles: files},
      findings,
    };
  },
};
