/**
 * @fileoverview Raw validated JUnit DTOs, independent of workflow finding policy.
 * @module github/scripts/helpers/reports/junit
 */
import * as xml from "./xml.ts";

/** Runner case fields retained from JUnit XML. */
export interface JUnitCase {
  readonly classname?: string;
  readonly name: string;
  readonly file?: string;
  readonly line?: number;
  readonly time?: number;
  readonly failureMessage?: string;
  readonly errorMessage?: string;
  readonly skipped?: boolean;
}

/** Runner suite counters and case evidence. */
export interface JUnitSuite {
  readonly name: string;
  readonly tests: number;
  readonly failures: number;
  readonly errors: number;
  readonly skipped: number;
  readonly time?: number;
  readonly cases: readonly JUnitCase[];
}

function errorMessage(value: unknown, fallback: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value === "string") return value || fallback;
  const node = xml.node(value, "JUnit failure");
  return xml.attribute(node, "message") || xml.content(node) || fallback;
}

function decodeCase(value: unknown): JUnitCase {
  const node = xml.node(value, "JUnit testcase");
  const classname = xml.attribute(node, "classname");
  const file = xml.attribute(node, "file");
  const line = xml.attribute(node, "line");
  const time = xml.attribute(node, "time");
  const failureMessage = errorMessage(node["failure"], "test failed");
  const error = errorMessage(node["error"], "test errored");
  return {
    name: xml.attribute(node, "name") ?? "<unnamed>",
    ...(classname === undefined ? {} : {classname}),
    ...(file === undefined ? {} : {file}),
    ...(line === undefined ? {} : {line: xml.numeric(line, "line", true)}),
    ...(time === undefined ? {} : {time: xml.numeric(time, "time")}),
    ...(failureMessage === undefined ? {} : {failureMessage}),
    ...(error === undefined ? {} : {errorMessage: error}),
    ...(node["skipped"] === undefined ? {} : {skipped: true}),
  };
}

/**
 * Decodes single, wrapped, or nested suites after XML syntax/number validation.
 * @param source - Serialized runner XML.
 * @returns Raw suites; no workflow findings or fabricated runner tests.
 * @throws TypeError for malformed documents or inconsistent counters.
 */
export function parseJUnitXml(source: string): readonly JUnitSuite[] {
  const doc = xml.document(source);
  const roots = doc["testsuites"] === undefined ? doc["testsuite"] : xml.node(doc["testsuites"], "testsuites")["testsuite"];
  if (roots === undefined) throw new TypeError("Invalid JUnit report: missing testsuite");
  const out: JUnitSuite[] = [];
  const visit = (value: unknown): void => {
    const node = xml.node(value, "JUnit testsuite");
    const children = xml.elements(node["testsuite"]);
    const cases = xml.elements(node["testcase"]).map(decodeCase);
    if (cases.length > 0 || children.length === 0) {
      const counter = (name: string, fallback: number): number => {
        const raw = xml.attribute(node, name);
        return raw === undefined ? fallback : xml.numeric(raw, name, true);
      };
      const tests = counter("tests", cases.length);
      const failures = counter("failures", cases.filter((test) => test.failureMessage !== undefined).length);
      const errors = counter("errors", cases.filter((test) => test.errorMessage !== undefined).length);
      const skipped = counter("skipped", cases.filter((test) => test.skipped).length);
      if (failures + errors + skipped > tests) throw new TypeError("Invalid JUnit report counters");
      const time = xml.attribute(node, "time");
      out.push({
        name: xml.attribute(node, "name") ?? "<unnamed-suite>",
        tests,
        failures,
        errors,
        skipped,
        ...(time === undefined ? {} : {time: xml.numeric(time, "time")}),
        cases,
      });
    }
    children.forEach(visit);
  };
  xml.elements(roots).forEach(visit);
  return out;
}
