/**
 * @fileoverview Raw TRX result decoding without application pass/fail policy.
 * @module github/scripts/helpers/reports/trx
 */
import * as xml from "./xml.ts";

/** Raw per-test Visual Studio result, preserving non-passing outcome names. */
export interface TrxResult {
  readonly testName: string;
  readonly outcome: string;
  readonly durationMs?: number;
  readonly errorMessage?: string;
  readonly stackTrace?: string;
}

/**
 * Parses the existing HH:MM:SS.fraction convenience format.
 * @param value - Optional duration attribute.
 * @returns Rounded milliseconds, or undefined when absent/invalid.
 */
export function parseTrxDuration(value: string | undefined): number | undefined {
  const match = value?.match(/^(\d+):([0-5]\d):([0-5]\d(?:\.\d+)?)$/);
  if (!match) return undefined;
  const result = Math.round(((Number(match[1]) * 60 + Number(match[2])) * 60 + Number(match[3])) * 1000);
  return Number.isSafeInteger(result) ? result : undefined;
}

/**
 * Validates and decodes single/multiple TRX results.
 * @param source - Serialized TRX document.
 * @returns Raw outcome evidence; the application decides how outcomes gate.
 * @throws TypeError for invalid XML, structure, or supplied duration.
 */
export function parseTrxResults(source: string): readonly TrxResult[] {
  const doc = xml.document(source);
  if (doc["TestRun"] === undefined) throw new TypeError("Invalid TRX report: missing TestRun");
  const run = xml.node(doc["TestRun"], "TestRun");
  const results = xml.node(run["Results"] ?? "", "TRX Results");
  return xml.elements(results["UnitTestResult"]).map((value): TrxResult => {
    const result = xml.node(value, "UnitTestResult");
    const output = xml.node(result["Output"] ?? "", "TRX Output");
    const error = xml.node(output["ErrorInfo"] ?? "", "TRX ErrorInfo");
    const duration = xml.attribute(result, "duration");
    const durationMs = parseTrxDuration(duration);
    if (duration !== undefined && durationMs === undefined) throw new TypeError("Invalid TRX duration");
    const errorMessage = xml.content(error["Message"]);
    const stackTrace = xml.content(error["StackTrace"]);
    return {
      testName: xml.attribute(result, "testName") ?? "<unnamed>",
      outcome: xml.attribute(result, "outcome") ?? "Unknown",
      ...(durationMs === undefined ? {} : {durationMs}),
      ...(errorMessage === undefined ? {} : {errorMessage}),
      ...(stackTrace === undefined ? {} : {stackTrace}),
    };
  });
}
