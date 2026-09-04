// @vitest-environment node
/**
 * @fileoverview Fixed four-step report cleanup order, the every-step-attempted rule, the unchanged
 * aggregated message form, and each artifact step's own no-op, rewrite, and removal behavior. Every
 * case runs against an in-memory {@link FileSystem}: nothing touches real disk, spawns Newman, or
 * transports a credential.
 * @module scripts/features/end-to-end/report-cleanup.test
 */

import {join} from "node:path";
import {describe, expect, it} from "vitest";

import type {FileSystem} from "../../core/runtime/runtime-capability.ts";
import {createMemoryFileSystem} from "../../testing/fixtures/memory-filesystem.fixture.ts";
import {buildRecordingPresenter} from "../../testing/fixtures/terminal.fixture.ts";
import {performEndToEndReportCleanup, sanitizeNewmanJsonReport, sanitizeNewmanTextReport, writeAssertionSummary} from "./report-cleanup.ts";

const reportDirectory = "/reports";
const jsonPath = join(reportDirectory, "newman-backend.json");
const junitPath = join(reportDirectory, "newman-backend.xml");
const summaryPath = join(reportDirectory, "newman-backend-summary.md");
const presenterFor = () => buildRecordingPresenter();

/** Wraps a filesystem so artifact writes and removals are recorded in call order. */
function withReportCallOrder(files: FileSystem, order: string[]): FileSystem {
  const isArtifact = (path: string): boolean => /newman-.*\.(json|xml)$|newman-.*-summary\.md$/.test(path);
  const name = (path: string): string => path.split(/[/\\]/).pop() ?? path;
  return {
    ...files,
    writeText: async (path, contents, options) => {
      if (isArtifact(path)) order.push(`write:${name(path)}`);
      return files.writeText(path, contents, options);
    },
    remove: async (path, options) => {
      if (isArtifact(path)) order.push(`remove:${name(path)}`);
      return files.remove(path, options);
    },
  };
}

/** Seeds a token-bearing JSON report and JUnit report, and nothing else. */
const seededReports = (token: string): FileSystem =>
  createMemoryFileSystem({
    [jsonPath]: JSON.stringify({run: {failures: []}, environment: {values: [{key: "authToken", value: token}]}}),
    [junitPath]: `<testsuites><testcase><system-out>authToken=${token}</system-out></testcase></testsuites>`,
  });

describe("end-to-end report cleanup ordering", () => {
  it("runs assertion summary, JSON, JUnit, then summary sanitization in that fixed order", async () => {
    const order: string[] = [];
    const files = withReportCallOrder(seededReports("secret-value"), order);
    await performEndToEndReportCleanup(files, "backend", reportDirectory, presenterFor().presenter, "secret-value");
    expect(order).toEqual([
      "write:newman-backend-summary.md",
      "write:newman-backend.json",
      "write:newman-backend.xml",
      "write:newman-backend-summary.md",
    ]);
    expect(await files.readText(junitPath)).toContain("[REDACTED]");
  });

  it("attempts every remaining step after an earlier step fails and aggregates every failure", async () => {
    const base = seededReports("secret-value");
    const attempted: string[] = [];
    const files: FileSystem = {
      ...base,
      writeText: async (path, contents, options) => {
        attempted.push(path);
        if (path === jsonPath) throw new Error("disk full");
        return base.writeText(path, contents, options);
      },
      readText: async (path) => {
        if (path === junitPath) throw new Error("unreadable junit");
        return base.readText(path);
      },
    };
    await expect(performEndToEndReportCleanup(files, "backend", reportDirectory, presenterFor().presenter, "secret-value")).rejects.toThrow(
      "Report cleanup failed for backend:\n"
        + `JSON report sanitization: Failed to write sanitized Newman JSON report, removed it: ${jsonPath} (disk full)\n`
        + `JUnit report sanitization: Failed to read text report, removed it: ${junitPath} (unreadable junit)`,
    );
    // The summary step still ran last, twice: once as generation and once as sanitization.
    expect(attempted.filter((path) => path === summaryPath)).toHaveLength(2);
  });

  it("labels every failing step and aggregates them under one unchanged message", async () => {
    const unparseable = () => createMemoryFileSystem({[jsonPath]: "{not valid json"});
    const {presenter} = presenterFor();
    await expect(performEndToEndReportCleanup(unparseable(), "backend", reportDirectory, presenter, undefined)).rejects.toThrow(
      "Report cleanup failed for backend:\n"
        + `assertion summary: Failed to read Newman JSON report while generating assertion summary: ${jsonPath} `,
    );
    await expect(performEndToEndReportCleanup(unparseable(), "backend", reportDirectory, presenter, undefined)).rejects.toThrow(
      `JSON report sanitization: Failed to parse Newman JSON report, removed it: ${jsonPath} `,
    );
  });
  it("resolves without throwing when no artifact exists at all", async () => {
    const {presenter, sink} = presenterFor();
    await expect(
      performEndToEndReportCleanup(createMemoryFileSystem(), "cv", reportDirectory, presenter, undefined),
    ).resolves.toBeUndefined();
    expect(sink.records.map(({text}) => text).join("\n")).toContain("JSON report not found, cannot create summary");
  });
});

describe("writeAssertionSummary", () => {
  it("is a no-op when the JSON report does not exist", async () => {
    const files = createMemoryFileSystem();
    await expect(writeAssertionSummary(files, "backend", reportDirectory, presenterFor().presenter)).resolves.toBeUndefined();
    expect(await files.exists(summaryPath)).toBe(false);
  });
  it("writes a 'no failed assertions' summary when the report has none", async () => {
    const files = createMemoryFileSystem({[jsonPath]: JSON.stringify({run: {failures: []}})});
    await writeAssertionSummary(files, "backend", reportDirectory, presenterFor().presenter);
    expect(await files.readText(summaryPath)).toContain("No failed assertions");
  });
  it("writes numbered failure detail with each failure's item, assertion, and error fallbacks", async () => {
    const failures = [
      {assertion: "Status is 200", error: "expected 200 but got 500", source: {name: "Get invoice"}},
      {error: {message: "boom"}, parent: {name: "Parent folder"}},
      {cursor: {scriptId: "script-7"}},
    ];
    const files = createMemoryFileSystem({[jsonPath]: JSON.stringify({run: {failures}})});
    await writeAssertionSummary(files, "backend", reportDirectory, presenterFor().presenter);
    const summary = await files.readText(summaryPath);
    expect(summary).toContain("### Failed Assertions (backend)");
    expect(summary).toContain('1. AssertionError  Status is 200\n   expected 200 but got 500\n   in "Get invoice"');
    expect(summary).toContain('2. AssertionError  Unknown assertion\n   boom\n   in "Parent folder"');
    expect(summary).toContain('3. AssertionError  Unknown assertion\n   Unknown error\n   in "script-7"');
  });
  it("throws when the JSON report cannot be parsed", async () => {
    const files = createMemoryFileSystem({[jsonPath]: "{not valid json"});
    await expect(writeAssertionSummary(files, "backend", reportDirectory, presenterFor().presenter)).rejects.toThrow(
      /Failed to read Newman JSON report/u,
    );
  });
});
describe("artifact sanitization faults", () => {
  it.each([
    ["JSON parse", jsonPath, "{not valid json", false, /Failed to parse Newman JSON report, removed it/u, sanitizeNewmanJsonReport],
    ["JSON write", jsonPath, JSON.stringify({safe: "v"}), true, /Failed to write sanitized Newman JSON report/u, sanitizeNewmanJsonReport],
    ["text read", junitPath, "<testcase/>", false, /Failed to read text report, removed it/u, sanitizeNewmanTextReport],
    ["text write", junitPath, "<testcase/>", true, /Failed to write sanitized text report, removed it/u, sanitizeNewmanTextReport],
  ] as const)("removes the artifact and throws on a %s fault", async (label, path, seed, failsOnWrite, message, sanitize) => {
    const base = createMemoryFileSystem({[path]: seed});
    const fault = (): Promise<never> => Promise.reject(new Error("io fault"));
    const readFaults = !failsOnWrite && label === "text read";
    const files: FileSystem = failsOnWrite ? {...base, writeText: fault} : readFaults ? {...base, readText: fault} : base;
    await expect(sanitize(files, path, presenterFor().presenter)).rejects.toThrow(message);
    expect(await files.exists(path)).toBe(false);
  });
  it.each([
    ["JSON", "/reports/missing.json", sanitizeNewmanJsonReport],
    ["text", "/reports/missing.xml", sanitizeNewmanTextReport],
  ] as const)("is a no-op when the %s report does not exist", async (_label, path, sanitize) => {
    await expect(sanitize(createMemoryFileSystem(), path, presenterFor().presenter)).resolves.toBeUndefined();
  });
  it("leaves an artifact with nothing to redact untouched and reports no redaction pass", async () => {
    const files = createMemoryFileSystem({[junitPath]: "<testcase>clean</testcase>"});
    const {presenter, sink} = presenterFor();
    await sanitizeNewmanTextReport(files, junitPath, presenter);
    expect(await files.readText(junitPath)).toBe("<testcase>clean</testcase>");
    expect(sink.records.map(({text}) => text).join("\n")).not.toContain("Sanitized text report");
  });
});
