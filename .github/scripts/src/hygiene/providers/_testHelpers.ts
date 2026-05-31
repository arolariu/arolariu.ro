/**
 * @fileoverview Shared helpers for test-suite providers.
 * @module github/scripts/src/hygiene/providers/_testHelpers
 *
 * @remarks
 * Test runners differ wildly across the stack:
 *   - Vitest emits structured JSON (numTotalTests, testResults[]).
 *   - dotnet test emits TRX (Microsoft's XML format).
 *   - pytest emits JUnit XML when invoked with --junitxml.
 *
 * This module normalizes all three into a common `SuiteResult` shape so that
 * each test-suite provider can compose a uniform `TestSuitesPayload` and so the
 * stepSummary projection can render them consistently.
 */

import {XMLParser} from "fast-xml-parser";
import type {Finding, LineFinding} from "../domain/types.ts";

/**
 * A normalized per-test-suite result. Each provider may produce 1..N of these
 * depending on whether it runs a single suite or fans out across many projects.
 */
export interface SuiteResult {
  readonly name: string;
  readonly totalTests: number;
  readonly passed: number;
  readonly failed: number;
  readonly skipped: number;
  readonly durationMs?: number;
  readonly findings: readonly Finding[];
}

/**
 * Aggregate shape returned by every test-suite provider.
 */
export interface TestSuitesPayload {
  readonly totalTests: number;
  readonly passed: number;
  readonly failed: number;
  readonly skipped: number;
  readonly suites: readonly SuiteResult[];
}

/**
 * Aggregates per-suite counts into a single payload.
 */
export function aggregateSuites(suites: readonly SuiteResult[]): TestSuitesPayload {
  let totalTests = 0;
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  for (const s of suites) {
    totalTests += s.totalTests;
    passed += s.passed;
    failed += s.failed;
    skipped += s.skipped;
  }
  return {totalTests, passed, failed, skipped, suites};
}

/**
 * Collects all findings across suites in a flat list (handy for the provider's
 * `findings` return value).
 */
export function flattenSuiteFindings(suites: readonly SuiteResult[]): Finding[] {
  const out: Finding[] = [];
  for (const s of suites) {
    out.push(...s.findings);
  }
  return out;
}

// ============================================================================
// JUnit XML parser (used by pytest --junitxml=...)
// ============================================================================

/**
 * Minimal subset of the JUnit XML schema that our providers care about.
 *
 * Example pytest output:
 * ```xml
 * <testsuites>
 *   <testsuite name="pytest" tests="3" failures="1" skipped="0" errors="0" time="0.123">
 *     <testcase classname="tests.module" name="test_foo" file="tests/test_foo.py" line="10" time="0.001"/>
 *     <testcase classname="tests.module" name="test_bar" file="tests/test_foo.py" line="20">
 *       <failure message="assert 1 == 2">AssertionError: 1 != 2</failure>
 *     </testcase>
 *   </testsuite>
 * </testsuites>
 * ```
 */
interface JUnitCase {
  readonly classname?: string;
  readonly name: string;
  readonly file?: string;
  readonly line?: number;
  readonly time?: number;
  readonly failureMessage?: string;
  readonly errorMessage?: string;
  readonly skipped?: boolean;
}

interface JUnitSuite {
  readonly name: string;
  readonly tests: number;
  readonly failures: number;
  readonly errors: number;
  readonly skipped: number;
  readonly time?: number;
  readonly cases: readonly JUnitCase[];
}

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  parseAttributeValue: true,
  isArray: (name) => name === "testsuite" || name === "testcase",
});

function asArray<T>(value: T | readonly T[] | undefined): readonly T[] {
  if (value === undefined || value === null) return [];
  if (Array.isArray(value)) return value;
  return [value as T];
}

function readText(node: unknown): string | undefined {
  if (node === undefined || node === null) return undefined;
  if (typeof node === "string") return node;
  if (typeof node === "object" && "#text" in (node as Record<string, unknown>)) {
    const text = (node as Record<string, unknown>)["#text"];
    return text === undefined || text === null ? undefined : String(text);
  }
  return undefined;
}

function readAttr(node: unknown, key: string): unknown {
  if (typeof node !== "object" || node === null) return undefined;
  return (node as Record<string, unknown>)[`@_${key}`];
}

/**
 * Parses a JUnit XML document into a list of normalized suites.
 * Tolerant of single-suite documents (no wrapping `<testsuites>`).
 */
export function parseJUnitXml(xml: string): JUnitSuite[] {
  const doc = xmlParser.parse(xml) as Record<string, unknown>;
  const root = doc["testsuites"] ?? doc;
  const suiteNodes = asArray((root as Record<string, unknown>)["testsuite"]);
  const fallback = doc["testsuite"];
  const suiteList = suiteNodes.length > 0 ? suiteNodes : asArray(fallback);

  return suiteList.map<JUnitSuite>((suite) => {
    const cases = asArray((suite as Record<string, unknown>)["testcase"]).map<JUnitCase>((tc) => {
      const failure = (tc as Record<string, unknown>)["failure"];
      const error = (tc as Record<string, unknown>)["error"];
      const skipped = (tc as Record<string, unknown>)["skipped"];
      const lineRaw = readAttr(tc, "line");
      const timeRaw = readAttr(tc, "time");
      return {
        ...(readAttr(tc, "classname") !== undefined ? {classname: String(readAttr(tc, "classname"))} : {}),
        name: String(readAttr(tc, "name") ?? "<unnamed>"),
        ...(readAttr(tc, "file") !== undefined ? {file: String(readAttr(tc, "file"))} : {}),
        ...(lineRaw !== undefined ? {line: Number(lineRaw)} : {}),
        ...(timeRaw !== undefined ? {time: Number(timeRaw)} : {}),
        ...(failure !== undefined ? {failureMessage: readAttr(failure, "message") !== undefined ? String(readAttr(failure, "message")) : readText(failure) ?? "test failed"} : {}),
        ...(error !== undefined ? {errorMessage: readAttr(error, "message") !== undefined ? String(readAttr(error, "message")) : readText(error) ?? "test errored"} : {}),
        ...(skipped !== undefined ? {skipped: true} : {}),
      };
    });
    return {
      name: String(readAttr(suite, "name") ?? "<unnamed-suite>"),
      tests: Number(readAttr(suite, "tests") ?? cases.length),
      failures: Number(readAttr(suite, "failures") ?? cases.filter((c) => c.failureMessage).length),
      errors: Number(readAttr(suite, "errors") ?? cases.filter((c) => c.errorMessage).length),
      skipped: Number(readAttr(suite, "skipped") ?? cases.filter((c) => c.skipped).length),
      ...(readAttr(suite, "time") !== undefined ? {time: Number(readAttr(suite, "time"))} : {}),
      cases,
    };
  });
}

/**
 * Maps a list of JUnit suites into a single `SuiteResult` plus a list of
 * `LineFinding`s for each failed or errored test case.
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
    if (suite.time !== undefined) durationMs += suite.time * 1000;
    for (const tc of suite.cases) {
      const errMsg = tc.failureMessage ?? tc.errorMessage;
      if (!errMsg) continue;
      const f: LineFinding = {
        kind: "line",
        severity: "error",
        file: tc.file ?? (tc.classname ?? "<unknown>"),
        line: tc.line ?? 1,
        column: 1,
        message: `${tc.classname ? tc.classname + " > " : ""}${tc.name}: ${errMsg}`,
        ruleId: `${name}/test-failure`,
        suite: name,
      };
      findings.push(f);
    }
  }
  const passed = totalTests - failed - skipped;
  return {
    name,
    totalTests,
    passed,
    failed,
    skipped,
    ...(durationMs > 0 ? {durationMs: Math.round(durationMs)} : {}),
    findings,
  };
}

// ============================================================================
// TRX (dotnet test) parser
// ============================================================================

/**
 * Minimal subset of the TRX (Visual Studio Test Results) schema.
 *
 * Example:
 * ```xml
 * <TestRun>
 *   <Results>
 *     <UnitTestResult testName="Foo_Bar_Baz" outcome="Passed" duration="00:00:00.0123456"/>
 *     <UnitTestResult testName="Foo_Qux" outcome="Failed" duration="00:00:00.001">
 *       <Output><ErrorInfo><Message>Assert.Equal failed.</Message><StackTrace>at ...</StackTrace></ErrorInfo></Output>
 *     </UnitTestResult>
 *   </Results>
 *   <ResultSummary><Counters total="2" passed="1" failed="1" /></ResultSummary>
 * </TestRun>
 * ```
 */
interface TrxResult {
  readonly testName: string;
  readonly outcome: string;
  readonly durationMs?: number;
  readonly errorMessage?: string;
  readonly stackTrace?: string;
}

/**
 * Parses a duration string like "00:00:00.0123456" into milliseconds.
 */
export function parseTrxDuration(s: string | undefined): number | undefined {
  if (!s) return undefined;
  const match = s.match(/^(\d+):(\d+):(\d+(?:\.\d+)?)$/);
  if (!match) return undefined;
  const h = Number(match[1]);
  const m = Number(match[2]);
  const sec = Number(match[3]);
  return Math.round(((h * 60 + m) * 60 + sec) * 1000);
}

/**
 * Parses a TRX document into a normalized `SuiteResult`.
 */
export function parseTrxToSuiteResult(name: string, xml: string): SuiteResult {
  const doc = xmlParser.parse(xml) as Record<string, unknown>;
  const testRun = (doc["TestRun"] ?? {}) as Record<string, unknown>;
  const results = (testRun["Results"] ?? {}) as Record<string, unknown>;
  // UnitTestResult may be an object (single result) or an array (multiple).
  const utr = results["UnitTestResult"];
  const rawList: unknown[] = Array.isArray(utr) ? utr : utr ? [utr] : [];

  const parsed: TrxResult[] = rawList.map((r) => {
    const errorInfo = (((r as Record<string, unknown>)["Output"] as Record<string, unknown> | undefined)?.["ErrorInfo"]) as Record<string, unknown> | undefined;
    return {
      testName: String(readAttr(r, "testName") ?? "<unnamed>"),
      outcome: String(readAttr(r, "outcome") ?? "Unknown"),
      ...(readAttr(r, "duration") !== undefined ? {durationMs: parseTrxDuration(String(readAttr(r, "duration")))} : {}),
      ...(errorInfo?.["Message"] !== undefined ? {errorMessage: readText(errorInfo["Message"]) ?? String(errorInfo["Message"])} : {}),
      ...(errorInfo?.["StackTrace"] !== undefined ? {stackTrace: readText(errorInfo["StackTrace"]) ?? String(errorInfo["StackTrace"])} : {}),
    };
  });

  const totalTests = parsed.length;
  const failed = parsed.filter((p) => /failed/i.test(p.outcome)).length;
  const skipped = parsed.filter((p) => /(notexecuted|skipped|inconclusive)/i.test(p.outcome)).length;
  const passed = totalTests - failed - skipped;
  const durationMs = parsed.reduce((sum, p) => sum + (p.durationMs ?? 0), 0);

  const findings: Finding[] = parsed
    .filter((p) => /failed/i.test(p.outcome))
    .map<LineFinding>((p) => ({
      kind: "line",
      severity: "error",
      file: p.testName,
      line: 1,
      column: 1,
      message: `${p.testName}: ${p.errorMessage ?? "Test failed"}`,
      ruleId: `${name}/test-failure`,
      suite: name,
    }));

  return {
    name,
    totalTests,
    passed,
    failed,
    skipped,
    ...(durationMs > 0 ? {durationMs} : {}),
    findings,
  };
}

// ============================================================================
// Shared Schema validator for TestSuitesPayload (used by all test providers)
// ============================================================================

import type {Schema} from "../domain/provider.ts";

export const testSuitesPayloadSchema: Schema<TestSuitesPayload> = {
  parse(data: unknown): TestSuitesPayload {
    if (typeof data !== "object" || data === null) throw new Error("payload not object");
    const r = data as Record<string, unknown>;
    if (!Array.isArray(r["suites"])) throw new Error("suites missing or not array");
    return {
      totalTests: Number(r["totalTests"] ?? 0),
      passed: Number(r["passed"] ?? 0),
      failed: Number(r["failed"] ?? 0),
      skipped: Number(r["skipped"] ?? 0),
      suites: r["suites"] as readonly SuiteResult[],
    };
  },
};

// ============================================================================
// Vitest JSON reporter helpers
// ============================================================================

export interface VitestAssertion {
  readonly fullName: string;
  readonly status: "passed" | "failed" | "pending" | "skipped" | "todo";
  readonly failureMessages: readonly string[];
  readonly location?: {readonly line: number; readonly column: number};
}

export interface VitestTestFile {
  readonly name: string;
  readonly status: "passed" | "failed";
  readonly assertionResults: readonly VitestAssertion[];
}

export interface VitestJsonReport {
  readonly numTotalTests: number;
  readonly numPassedTests: number;
  readonly numFailedTests: number;
  readonly numPendingTests: number;
  readonly testResults: readonly VitestTestFile[];
}

/**
 * Extracts the last balanced JSON object containing a Vitest `testResults`
 * field from a stdout stream. Robust against npm/nx preamble noise, multiple
 * concatenated reports (one per project when nx run-many is used), and curly
 * braces appearing inside JSON-encoded failure messages.
 */
export function extractLastVitestReport(stdout: string): VitestJsonReport | null {
  const candidates: string[] = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escape = false;
  for (let i = 0; i < stdout.length; i++) {
    const ch = stdout[i];
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (inString) {
      if (ch === "\"") inString = false;
      continue;
    }
    if (ch === "\"") { inString = true; continue; }
    if (ch === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0 && start !== -1) {
        candidates.push(stdout.slice(start, i + 1));
        start = -1;
      }
    }
  }
  for (let i = candidates.length - 1; i >= 0; i--) {
    const blob = candidates[i];
    if (!blob) continue;
    try {
      const parsed = JSON.parse(blob) as Partial<VitestJsonReport>;
      if (Array.isArray(parsed.testResults)) {
        return parsed as VitestJsonReport;
      }
    } catch {
      // Skip non-Vitest JSON blobs.
    }
  }
  return null;
}

/**
 * Converts a single Vitest JSON report into a normalized `SuiteResult`.
 * `name` becomes the suite label rendered in the PR comment / step summary.
 * Each failed assertion becomes one `LineFinding` tagged with `suite: name`.
 */
export function vitestReportToSuiteResult(name: string, report: VitestJsonReport): SuiteResult {
  const findings: Finding[] = [];
  for (const file of report.testResults) {
    for (const assertion of file.assertionResults) {
      if (assertion.status === "failed") {
        const message = `${assertion.fullName}: ${assertion.failureMessages.join(" / ")}`;
        const f: LineFinding = {
          kind: "line",
          severity: "error",
          file: file.name,
          line: assertion.location?.line ?? 1,
          column: assertion.location?.column ?? 1,
          message,
          ruleId: `${name}/test-failure`,
          suite: name,
        };
        findings.push(f);
      }
    }
  }
  return {
    name,
    totalTests: report.numTotalTests,
    passed: report.numPassedTests,
    failed: report.numFailedTests,
    skipped: report.numPendingTests,
    findings,
  };
}
