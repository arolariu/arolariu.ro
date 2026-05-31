import {describe, it, expect, vi} from "vitest";
import {outcomeToCheckRun, postStatusChecks} from "./statusChecks.ts";
import type {ProviderOutcome, HygieneReport} from "../domain/types.ts";

const passed: ProviderOutcome<unknown> = {
  providerId: "format", providerName: "Prettier", providerIcon: "🎨",
  gate: {kind: "blocking", blockOn: "error"}, gateResult: "passed",
  durationMs: 100, startedAt: "2026-05-30T00:00:00.000Z", finishedAt: "2026-05-30T00:00:00.100Z",
  payload: null, findings: [], error: null,
};
const failed: ProviderOutcome<unknown> = {...passed, providerId: "lint", providerName: "ESLint", gateResult: "failed"};
const advisory: ProviderOutcome<unknown> = {...passed, providerId: "stats", providerName: "Stats", gateResult: "advisory", gate: {kind: "advisory"}};
const errored: ProviderOutcome<unknown> = {...passed, providerId: "test", providerName: "Vitest", gateResult: "errored", error: {message: "boom"}};

describe("outcomeToCheckRun", () => {
  it("passed -> success conclusion", () => {
    const c = outcomeToCheckRun(passed, "abc");
    expect(c.name).toBe("hygiene/format");
    expect(c.conclusion).toBe("success");
    expect(c.head_sha).toBe("abc");
  });

  it("failed -> failure conclusion", () => {
    expect(outcomeToCheckRun(failed, "x").conclusion).toBe("failure");
  });

  it("advisory -> neutral conclusion", () => {
    expect(outcomeToCheckRun(advisory, "x").conclusion).toBe("neutral");
  });

  it("errored -> failure conclusion (visible failure)", () => {
    expect(outcomeToCheckRun(errored, "x").conclusion).toBe("failure");
  });

  it("includes finding count in output summary", () => {
    const c = outcomeToCheckRun({...passed, findings: [
      {kind: "line", severity: "error", file: "a", line: 1, column: 1, message: "x"},
    ]}, "x");
    expect(c.output.summary).toMatch(/1/);
  });
});

describe("postStatusChecks", () => {
  it("creates one check-run per outcome", async () => {
    const create = vi.fn().mockResolvedValue({});
    const report: HygieneReport = {
      schemaVersion: "3", commitSha: "abc", prNumber: 1,
      workflowRunId: "1", workflowRunUrl: "https://x/1",
      generatedAt: "2026-05-30T00:00:00.000Z",
      overallResult: "failed",
      outcomes: [passed, failed],
    };
    await postStatusChecks(report, {owner: "o", repo: "r", create});
    expect(create).toHaveBeenCalledTimes(2);
  });
});
