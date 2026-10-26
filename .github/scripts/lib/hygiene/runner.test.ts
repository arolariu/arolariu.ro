import {describe, expect, it, vi} from "vitest";
import type {Clock} from "../context.ts";
import {context} from "../planning/fixtures/plans.ts";
import {plan} from "./fixtures/outcomes.ts";
import {formatPayloadSchema} from "./payloads.ts";
import {providerDescriptor} from "./registry.ts";
import {executeProvider} from "./runner.ts";
import type {CheckProvider, ProviderRunInput, ProviderRunOutput} from "./contracts.ts";

const input: ProviderRunInput = {
  workspaceRoot: process.cwd(),
  baseRef: "base",
  headRef: "head",
  changeScope: "known",
  changedFiles: [],
  env: {},
};
function clock(): Clock {
  let tick = 0;
  return {
    now: () => new Date("2026-01-01T00:00:00Z"),
    monotonicMs: () => {
      tick += 25;
      return tick;
    },
  };
}
function provider(run: () => Promise<ProviderRunOutput<unknown>>): CheckProvider<unknown> {
  return {...providerDescriptor("format"), payloadSchema: formatPayloadSchema, applicableTo: () => true, run};
}

describe("versioned provider execution", () => {
  it("uses injected wall/monotonic clocks and validates successful output", async () => {
    const planned = plan();
    const result = await executeProvider(
      provider(async () => ({payload: {unformattedCount: 0, unformattedFiles: []}, findings: []})),
      input,
      context(),
      planned,
      clock(),
    );
    expect(result).toMatchObject({
      schemaVersion: "1",
      durationMs: 25,
      executionStatus: "passed",
      evidenceStatus: "complete",
      planId: planned.id,
      workflowRunAttempt: 1,
    });
  });
  it("preserves a finding exit separately from operation failure", async () => {
    const result = await executeProvider(
      provider(async () => ({
        payload: {unformattedCount: 1, unformattedFiles: ["x.ts"]},
        findings: [{kind: "file", severity: "warning", file: "x.ts", message: "Unformatted"}],
        executionStatus: "failed",
      })),
      input,
      context(),
      plan(),
      clock(),
    );
    expect(result).toMatchObject({executionStatus: "failed", gateResult: "failed", evidenceStatus: "complete", error: null});
  });
  it("captures operational errors without fabricating payload or test counts", async () => {
    const failure = new Error("Operational command failure");
    const result = await executeProvider(
      provider(async () => {
        throw failure;
      }),
      input,
      context(),
      plan(),
      clock(),
    );
    expect(result).toMatchObject({executionStatus: "errored", gateResult: "errored", payload: null, error: {message: failure.message}});
  });
  it("does not call executable provider logic for a planned skip", async () => {
    const run = vi.fn(async () => {
      throw new Error("Must not execute");
    });
    const result = await executeProvider(provider(run), input, context(), plan(true), clock());
    expect(run).not.toHaveBeenCalled();
    expect(result).toMatchObject({executionStatus: "skipped", gateResult: "passed", payload: null});
    expect(result.skipReason).toBeTruthy();
  });
  it("turns invalid provider payload into explicit invalid evidence", async () => {
    const result = await executeProvider(
      provider(async () => ({payload: {unformattedCount: -1, unformattedFiles: []}, findings: []})),
      input,
      context(),
      plan(),
      clock(),
    );
    expect(result).toMatchObject({executionStatus: "errored", evidenceStatus: "invalid", gateResult: "errored"});
  });
});
