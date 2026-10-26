/**
 * @fileoverview Workflow suite normalization over validated raw reporter DTOs.
 * @module github/scripts/lib/testing/suites
 */
import {type JUnitSuite} from "../../helpers/reports/junit.ts";
import {parseTrxResults} from "../../helpers/reports/trx.ts";
import {decodeVitestReport, type VitestJsonReport} from "../../helpers/reports/vitest.ts";
import {array, count, finite, record, text} from "../../helpers/reports/validation.ts";
import {decodeFinding, type Finding, type LineFinding, type Schema} from "../hygiene/contracts.ts";

/** One workflow-labelled suite; runner errors are findings, never fabricated tests. */
export interface SuiteResult {
  readonly name: string;
  readonly totalTests: number;
  readonly passed: number;
  readonly failed: number;
  readonly skipped: number;
  readonly durationMs?: number;
  readonly findings: readonly Finding[];
}
/** Aggregate payload shared by all test providers. */
export interface TestSuitesPayload {
  readonly totalTests: number;
  readonly passed: number;
  readonly failed: number;
  readonly skipped: number;
  readonly suites: readonly SuiteResult[];
}

/**
 * Sums normalized suites, retaining their identity/order.
 * @param suites - Already normalized runner results.
 * @returns Aggregate counters and the original suite collection.
 */
export function aggregateSuites(suites: readonly SuiteResult[]): TestSuitesPayload {
  return {
    totalTests: suites.reduce((sum, suite) => sum + suite.totalTests, 0),
    passed: suites.reduce((sum, suite) => sum + suite.passed, 0),
    failed: suites.reduce((sum, suite) => sum + suite.failed, 0),
    skipped: suites.reduce((sum, suite) => sum + suite.skipped, 0),
    suites,
  };
}

/**
 * Collects findings without reordering their suites.
 * @param suites - Normalized suite results.
 * @returns A new flat finding collection.
 */
export function flattenSuiteFindings(suites: readonly SuiteResult[]): Finding[] {
  return suites.flatMap((suite) => [...suite.findings]);
}

/**
 * Records a runner/evidence failure without pretending a test assertion ran.
 * @param name - Stable suite label.
 * @param file - Runner/report diagnostic location.
 * @param message - Safe execution/evidence diagnostic.
 * @returns A zero-count suite carrying a genuine operational finding.
 */
export function runnerErrorSuite(name: string, file: string, message: string): SuiteResult {
  return {
    name,
    totalTests: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    findings: [{kind: "file", severity: "error", file, message, ruleId: `${name}/runner-failed`}],
  };
}

/**
 * Normalizes JUnit cases/counters into workflow findings.
 * @param name - Stable suite label.
 * @param suites - Decoded raw JUnit suites.
 * @returns The normalized result without inventing runner-error tests.
 */
export function jUnitSuitesToResult(name: string, suites: readonly JUnitSuite[]): SuiteResult {
  let totalTests = 0;
  let failed = 0;
  let skipped = 0;
  let durationMs = 0;
  const findings: Finding[] = [];
  for (const suite of suites) {
    totalTests += suite.tests;
    failed += suite.failures + suite.errors;
    skipped += suite.skipped;
    durationMs += (suite.time ?? 0) * 1000;
    for (const test of suite.cases) {
      const error = test.failureMessage ?? test.errorMessage;
      if (error === undefined) continue;
      findings.push({
        kind: "line",
        severity: "error",
        file: test.file ?? test.classname ?? "<unknown>",
        line: Math.max(1, test.line ?? 1),
        column: 1,
        message: `${test.classname ? test.classname + " > " : ""}${test.name}: ${error}`,
        ruleId: `${name}/test-failure`,
        suite: name,
      });
    }
  }
  return {
    name,
    totalTests,
    passed: totalTests - failed - skipped,
    failed,
    skipped,
    ...(durationMs > 0 ? {durationMs: Math.round(durationMs)} : {}),
    findings,
  };
}

/**
 * Treats only Passed as passing; unknown/error/aborted outcomes remain failures.
 * @param name - Stable suite label.
 * @param source - Serialized TRX evidence.
 * @returns Normalized counters/findings over the actual raw test results.
 */
export function parseTrxToSuiteResult(name: string, source: string): SuiteResult {
  const parsed = parseTrxResults(source);
  const skippedOutcome = (outcome: string): boolean => ["notexecuted", "skipped", "inconclusive"].includes(outcome.toLowerCase());
  const failures = parsed.filter((result) => result.outcome.toLowerCase() !== "passed" && !skippedOutcome(result.outcome));
  const skipped = parsed.filter((result) => skippedOutcome(result.outcome)).length;
  const durationMs = parsed.reduce((sum, result) => sum + (result.durationMs ?? 0), 0);
  return {
    name,
    totalTests: parsed.length,
    passed: parsed.length - failures.length - skipped,
    failed: failures.length,
    skipped,
    ...(durationMs > 0 ? {durationMs} : {}),
    findings: failures.map((result): LineFinding => ({
      kind: "line",
      severity: "error",
      file: result.testName,
      line: 1,
      column: 1,
      message: `${result.testName}: ${result.errorMessage ?? `Test outcome: ${result.outcome}`}`,
      ruleId: `${name}/test-failure`,
      suite: name,
    })),
  };
}

/**
 * Extracts the last reporter-shaped JSON from noisy/concatenated stdout.
 * @param stdout - Captured native runner output.
 * @returns Validated report or null when no report exists.
 * @throws TypeError if the latest reporter-shaped object is malformed.
 */
export function extractLastVitestReport(stdout: string): VitestJsonReport | null {
  const candidates: string[] = [];
  let depth = 0;
  let start = -1;
  let quoted = false;
  let escaped = false;
  for (let index = 0; index < stdout.length; index++) {
    const ch = stdout[index];
    if (quoted) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') quoted = false;
    } else if (ch === '"' && depth > 0) quoted = true;
    else if (ch === "{") {
      if (depth === 0) start = index;
      depth++;
    } else if (ch === "}" && depth > 0) {
      depth--;
      if (depth === 0 && start >= 0) candidates.push(stdout.slice(start, index + 1));
    }
  }
  for (const candidate of candidates.reverse()) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(candidate);
    } catch (error) {
      if (error instanceof SyntaxError) continue;
      throw error;
    }
    if (typeof parsed === "object" && parsed !== null && Object.hasOwn(parsed, "testResults")) return decodeVitestReport(parsed);
  }
  return null;
}

/**
 * Normalizes assertions and collection failures using the caller's suite label.
 * @param name - Stable workflow suite name.
 * @param report - Validated serialized reporter DTO.
 * @returns Suite counters plus genuine assertion/file findings.
 */
export function vitestReportToSuiteResult(name: string, report: VitestJsonReport): SuiteResult {
  const findings: Finding[] = [];
  for (const file of report.testResults) {
    const failed = file.assertionResults.filter((assertion) => assertion.status === "failed");
    for (const assertion of failed)
      findings.push({
        kind: "line",
        severity: "error",
        file: file.name,
        line: Math.max(1, assertion.location?.line ?? 1),
        column: Math.max(1, assertion.location?.column ?? 1),
        message: `${assertion.fullName}: ${assertion.failureMessages.join(" / ")}`,
        ruleId: `${name}/test-failure`,
        suite: name,
      });
    if (file.status === "failed" && failed.length === 0)
      findings.push({
        kind: "file",
        severity: "error",
        file: file.name,
        message: file.message || "Test file failed before assertions completed",
        ruleId: `${name}/runner-error`,
      });
  }
  return {
    name,
    totalTests: report.numTotalTests,
    passed: report.numPassedTests,
    failed: report.numFailedTests,
    skipped: report.numPendingTests + (report.numTodoTests ?? 0),
    findings,
  };
}

function counters(value: Record<string, unknown>): {totalTests: number; passed: number; failed: number; skipped: number} {
  const result = {
    totalTests: count(value["totalTests"], "suite totalTests"),
    passed: count(value["passed"], "suite passed"),
    failed: count(value["failed"], "suite failed"),
    skipped: count(value["skipped"], "suite skipped"),
  };
  if (result.passed + result.failed + result.skipped !== result.totalTests) throw new TypeError("Invalid suite counters");
  return result;
}

/** Deep payload decoder retained at the compatibility export until registry ownership. */
export const testSuitesPayloadSchema: Schema<TestSuitesPayload> = {
  parse(value: unknown): TestSuitesPayload {
    const raw = record(value, "test suites payload");
    const totals = counters(raw);
    const suites = array(raw["suites"], "suites").map((value): SuiteResult => {
      const suite = record(value, "suite");
      return {
        name: text(suite["name"], "suite name"),
        ...counters(suite),
        ...(suite["durationMs"] === undefined ? {} : {durationMs: finite(suite["durationMs"], "suite durationMs")}),
        findings: array(suite["findings"], "suite findings").map(decodeFinding),
      };
    });
    const aggregate = aggregateSuites(suites);
    if ((["totalTests", "passed", "failed", "skipped"] as const).some((key) => aggregate[key] !== totals[key]))
      throw new TypeError("Suite aggregate counters do not match");
    return {...totals, suites};
  },
};
