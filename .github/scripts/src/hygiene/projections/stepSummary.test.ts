import {describe, it, expect} from "vitest";
import {buildStepSummary} from "./stepSummary.ts";
import type {HygieneReport, ProviderOutcome} from "../domain/types.ts";

function makeOutcome(o: Partial<ProviderOutcome<unknown>>): ProviderOutcome<unknown> {
  return {
    providerId: "x", providerName: "X", providerIcon: "🟦",
    gate: {kind: "blocking", blockOn: "error"},
    gateResult: "passed",
    durationMs: 100,
    startedAt: "2026-05-30T00:00:00.000Z",
    finishedAt: "2026-05-30T00:00:00.100Z",
    payload: null, findings: [], error: null,
    ...o,
  };
}

const report: HygieneReport = {
  schemaVersion: "3", commitSha: "abc1234", prNumber: 42,
  workflowRunId: "1", workflowRunUrl: "https://x/1",
  generatedAt: "2026-05-30T00:00:00.000Z",
  overallResult: "passed",
  outcomes: [
    makeOutcome({providerId: "format", providerName: "Prettier", providerIcon: "🎨"}),
    makeOutcome({providerId: "lint", providerName: "ESLint", providerIcon: "🔍", gateResult: "failed",
      findings: [{kind: "line", severity: "error", file: "x.ts", line: 1, column: 1, message: "bad"}]}),
  ],
};

describe("buildStepSummary", () => {
  it("includes a header with overall result", () => {
    const md = buildStepSummary(report);
    expect(md).toMatch(/Code Hygiene/);
    expect(md).toMatch(/passed/i);
  });

  it("includes a table row per provider", () => {
    const md = buildStepSummary(report);
    expect(md).toMatch(/Prettier/);
    expect(md).toMatch(/ESLint/);
  });

  it("shows finding count per provider", () => {
    const md = buildStepSummary(report);
    expect(md).toMatch(/1 finding/);
  });

  it("displays errored providers prominently", () => {
    const errReport: HygieneReport = {
      ...report,
      overallResult: "errored",
      outcomes: [makeOutcome({gateResult: "errored", error: {message: "boom"}})],
    };
    const md = buildStepSummary(errReport);
    expect(md).toMatch(/boom/);
  });
});
