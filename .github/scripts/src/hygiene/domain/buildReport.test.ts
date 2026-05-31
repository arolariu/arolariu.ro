import {describe, it, expect} from "vitest";
import {buildReport, type BuildReportInput} from "./buildReport.ts";
import type {ProviderOutcome} from "./types.ts";

function makeOutcome(overrides: Partial<ProviderOutcome<unknown>> = {}): ProviderOutcome<unknown> {
  return {
    providerId: "format",
    providerName: "Prettier",
    providerIcon: "🎨",
    gate: {kind: "blocking", blockOn: "error"},
    gateResult: "passed",
    durationMs: 100,
    startedAt: "2026-05-30T00:00:00.000Z",
    finishedAt: "2026-05-30T00:00:00.100Z",
    payload: null,
    findings: [],
    error: null,
    ...overrides,
  };
}

const baseInput: BuildReportInput = {
  outcomes: [],
  commitSha: "abc123",
  prNumber: 42,
  workflowRunId: "999",
  workflowRunUrl: "https://github.com/owner/repo/actions/runs/999",
};

describe("buildReport", () => {
  it("sets schemaVersion to '3'", () => {
    const report = buildReport({...baseInput, outcomes: [makeOutcome()]});
    expect(report.schemaVersion).toBe("3");
  });

  it("copies metadata through", () => {
    const report = buildReport({...baseInput, outcomes: [makeOutcome()]});
    expect(report.commitSha).toBe("abc123");
    expect(report.prNumber).toBe(42);
    expect(report.workflowRunId).toBe("999");
    expect(report.workflowRunUrl).toBe("https://github.com/owner/repo/actions/runs/999");
  });

  it("includes generatedAt as ISO 8601", () => {
    const report = buildReport({...baseInput, outcomes: [makeOutcome()]});
    expect(report.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it("overallResult is 'errored' when any outcome errored", () => {
    const report = buildReport({
      ...baseInput,
      outcomes: [
        makeOutcome({gateResult: "passed"}),
        makeOutcome({providerId: "lint", gateResult: "errored"}),
        makeOutcome({providerId: "test", gateResult: "passed"}),
      ],
    });
    expect(report.overallResult).toBe("errored");
  });

  it("overallResult is 'failed' when any outcome failed and none errored", () => {
    const report = buildReport({
      ...baseInput,
      outcomes: [
        makeOutcome({gateResult: "passed"}),
        makeOutcome({providerId: "lint", gateResult: "failed"}),
        makeOutcome({providerId: "test", gateResult: "advisory"}),
      ],
    });
    expect(report.overallResult).toBe("failed");
  });

  it("overallResult is 'advisory' when any outcome is advisory and none failed/errored", () => {
    const report = buildReport({
      ...baseInput,
      outcomes: [
        makeOutcome({gateResult: "passed"}),
        makeOutcome({providerId: "stats", gateResult: "advisory"}),
      ],
    });
    expect(report.overallResult).toBe("advisory");
  });

  it("overallResult is 'passed' when all outcomes passed", () => {
    const report = buildReport({
      ...baseInput,
      outcomes: [makeOutcome(), makeOutcome({providerId: "lint"})],
    });
    expect(report.overallResult).toBe("passed");
  });

  it("preserves outcome order", () => {
    const report = buildReport({
      ...baseInput,
      outcomes: [
        makeOutcome({providerId: "format"}),
        makeOutcome({providerId: "lint"}),
        makeOutcome({providerId: "test"}),
      ],
    });
    expect(report.outcomes.map((o) => o.providerId)).toEqual(["format", "lint", "test"]);
  });

  it("handles empty outcomes list as passed", () => {
    const report = buildReport({...baseInput, outcomes: []});
    expect(report.overallResult).toBe("passed");
    expect(report.outcomes).toEqual([]);
  });
});
