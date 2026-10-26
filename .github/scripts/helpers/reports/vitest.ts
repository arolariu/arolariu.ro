/**
 * @fileoverview Validated serialized Vitest JSON reporter DTOs.
 * @module github/scripts/helpers/reports/vitest
 */
import {array, count, record, text} from "./validation.ts";

/** Serialized assertion evidence, not a runtime Vitest object. */
export interface VitestAssertion {
  readonly fullName: string;
  readonly status: "passed" | "failed" | "pending" | "skipped" | "todo";
  readonly failureMessages: readonly string[];
  readonly location?: {readonly line: number; readonly column: number};
}
/** Serialized test-file result, including collection errors with no assertions. */
export interface VitestTestFile {
  readonly name: string;
  readonly status: "passed" | "failed";
  readonly assertionResults: readonly VitestAssertion[];
  readonly message?: string;
}
/** Reporter counters; TODO remains distinct until workflow normalization. */
export interface VitestJsonReport {
  readonly numTotalTests: number;
  readonly numPassedTests: number;
  readonly numFailedTests: number;
  readonly numPendingTests: number;
  readonly numTodoTests?: number;
  readonly testResults: readonly VitestTestFile[];
}

function assertion(value: unknown): VitestAssertion {
  const raw = record(value, "Vitest assertion");
  const status = raw["status"];
  if (status !== "passed" && status !== "failed" && status !== "pending" && status !== "skipped" && status !== "todo")
    throw new TypeError("Invalid Vitest assertion status");
  const location = raw["location"] === undefined ? undefined : record(raw["location"], "Vitest location");
  return {
    fullName: text(raw["fullName"], "Vitest fullName"),
    status,
    failureMessages: array(raw["failureMessages"], "Vitest failureMessages").map((value) => text(value, "Vitest failureMessage")),
    ...(location === undefined
      ? {}
      : {location: {line: count(location["line"], "Vitest line"), column: count(location["column"], "Vitest column")}}),
  };
}

/**
 * Decodes actual reporter JSON, rejecting invalid counters and assertion shapes.
 * @param value - Untrusted parsed JSON.
 * @returns A validated serialized DTO, independent of workflow normalization.
 * @throws TypeError for malformed or internally inconsistent counters.
 */
export function decodeVitestReport(value: unknown): VitestJsonReport {
  const raw = record(value, "Vitest report");
  const numTotalTests = count(raw["numTotalTests"], "Vitest numTotalTests");
  const numPassedTests = count(raw["numPassedTests"], "Vitest numPassedTests");
  const numFailedTests = count(raw["numFailedTests"], "Vitest numFailedTests");
  const numPendingTests = count(raw["numPendingTests"], "Vitest numPendingTests");
  const numTodoTests = raw["numTodoTests"] === undefined ? undefined : count(raw["numTodoTests"], "Vitest numTodoTests");
  if (numPassedTests + numFailedTests + numPendingTests + (numTodoTests ?? 0) !== numTotalTests)
    throw new TypeError("Invalid Vitest report counters");
  const testResults = array(raw["testResults"], "Vitest testResults").map((value): VitestTestFile => {
    const file = record(value, "Vitest test file");
    const status = file["status"];
    if (status !== "passed" && status !== "failed") throw new TypeError("Invalid Vitest file status");
    return {
      name: text(file["name"], "Vitest file name"),
      status,
      assertionResults: array(file["assertionResults"], "Vitest assertionResults").map(assertion),
      ...(file["message"] === undefined ? {} : {message: text(file["message"], "Vitest file message")}),
    };
  });
  const assertionCount = testResults.reduce((total, file) => total + file.assertionResults.length, 0);
  if (assertionCount !== numTotalTests) throw new TypeError("Vitest assertion count does not match numTotalTests");
  return {
    numTotalTests,
    numPassedTests,
    numFailedTests,
    numPendingTests,
    ...(numTodoTests === undefined ? {} : {numTodoTests}),
    testResults,
  };
}
