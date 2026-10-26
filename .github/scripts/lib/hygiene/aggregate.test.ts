import {describe, expect, it} from "vitest";
import {context} from "../planning/fixtures/plans.ts";
import {buildVerifiedReport} from "./aggregate.ts";
import {outcome, plan} from "./fixtures/outcomes.ts";
import {providerIds} from "./registry.ts";

describe("verified hygiene aggregation", () => {
  it("never passes an empty aggregate, even when the plan explicitly selects no work", () => {
    expect(buildVerifiedReport(context(), plan(), {outcomes: [], issues: []}).overallResult).toBe("errored");
    expect(buildVerifiedReport(context(), plan(true), {outcomes: [], issues: []}).overallResult).toBe("errored");
  });
  it("passes a known-empty plan only with all six explicit skip records", () => {
    const planned = plan(true);
    const report = buildVerifiedReport(context(), planned, {outcomes: providerIds().map((id) => outcome(planned, id)), issues: []});
    expect(report).toMatchObject({schemaVersion: "3", overallResult: "passed", commitSha: planned.commitSha, plan: {id: planned.id}});
    expect(report.outcomes).toHaveLength(6);
  });
  it("retains valid results but fails on any evidence issue", () => {
    const planned = plan();
    const outcomes = providerIds().map((id) => outcome(planned, id));
    const report = buildVerifiedReport(context(), planned, {
      outcomes,
      issues: [{code: "future-attempt", message: "Future record rejected", providerId: "format"}],
    });
    expect(report.overallResult).toBe("errored");
    expect(report.outcomes).toHaveLength(6);
    expect(report.evidenceIssues?.[0]?.code).toBe("future-attempt");
  });
  it("cannot pass an explicitly failed execution with otherwise passing metrics", () => {
    const planned = plan();
    const failed = outcome(planned, "format", {executionStatus: "failed", gateResult: "failed"});
    const report = buildVerifiedReport(context(), planned, {
      outcomes: providerIds().map((id) => (id === "format" ? failed : outcome(planned, id))),
      issues: [],
    });
    expect(report.overallResult).toBe("failed");
  });
  it("defensively rejects duplicate or incompatible selected records", () => {
    const planned = plan();
    const outcomes = providerIds().map((id) => outcome(planned, id));
    expect(buildVerifiedReport(context(), planned, {outcomes: [...outcomes, outcome(planned, "format")], issues: []}).overallResult).toBe(
      "errored",
    );
    expect(
      buildVerifiedReport(context(), planned, {outcomes: outcomes.map((value) => ({...value, commitSha: "0".repeat(40)})), issues: []})
        .overallResult,
    ).toBe("errored");
  });
});
