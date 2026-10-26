/**
 * @fileoverview Validated native ESLint JSON report DTOs.
 * @module github/scripts/helpers/reports/eslint
 */
import {array, count, record, text} from "./validation.ts";

/** Serialized lint message; missing locations normalize to the first position. */
export interface EslintMessage {
  readonly line: number;
  readonly column: number;
  readonly endLine?: number;
  readonly endColumn?: number;
  readonly severity: 0 | 1 | 2;
  readonly message: string;
  readonly ruleId: string | null;
}
/** Serialized file evidence with validated counters/messages. */
export interface EslintFileResult {
  readonly filePath: string;
  readonly errorCount: number;
  readonly warningCount: number;
  readonly messages: readonly EslintMessage[];
}

/**
 * Validates raw ESLint output before workflow finding normalization.
 * @param value - Untrusted JSON parsed from the native CLI.
 * @returns Complete file/message DTOs; invalid severity/counts never become clean output.
 * @throws TypeError for malformed serialized reports.
 */
export function decodeEslintReport(value: unknown): readonly EslintFileResult[] {
  return array(value, "ESLint files").map((value) => {
    const file = record(value, "ESLint file");
    return {
      filePath: text(file["filePath"], "ESLint filePath"),
      errorCount: count(file["errorCount"], "ESLint errorCount"),
      warningCount: count(file["warningCount"], "ESLint warningCount"),
      messages: array(file["messages"], "ESLint messages").map((value): EslintMessage => {
        const message = record(value, "ESLint message");
        const severity = message["severity"];
        if (severity !== 0 && severity !== 1 && severity !== 2) throw new TypeError("Invalid ESLint severity");
        return {
          line: Math.max(1, count(message["line"] ?? 1, "ESLint line")),
          column: Math.max(1, count(message["column"] ?? 1, "ESLint column")),
          severity,
          message: text(message["message"], "ESLint message text"),
          ruleId: message["ruleId"] === null || message["ruleId"] === undefined ? null : text(message["ruleId"], "ESLint ruleId"),
          ...(message["endLine"] === undefined ? {} : {endLine: Math.max(1, count(message["endLine"], "ESLint endLine"))}),
          ...(message["endColumn"] === undefined ? {} : {endColumn: Math.max(1, count(message["endColumn"], "ESLint endColumn"))}),
        };
      }),
    };
  });
}
