import {mkdtemp, rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {afterEach, beforeEach, describe, expect, it} from "vitest";
import {fs} from "../../helpers/filesystem/index.ts";
import {decodeProviderOutcome, loadProviderOutcomes} from "./outcomes.ts";
import {providerIds} from "./registry.ts";
import {outcome, plan} from "./fixtures/outcomes.ts";
import {context} from "../planning/fixtures/plans.ts";
import {aggregateSuites, runnerErrorSuite} from "../testing/suites.ts";
import {buildVerifiedReport} from "./aggregate.ts";

let directory: string;
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "hygiene-evidence-"));
});
afterEach(async () => {
  await rm(directory, {recursive: true, force: true});
});

describe("versioned provider decoding", () => {
  it("accepts legitimate skipped/null evidence without running an object payload decoder", () => {
    const planned = plan(true);
    expect(decodeProviderOutcome(outcome(planned, "format"), planned)).toMatchObject({executionStatus: "skipped", payload: null});
  });
  it.each([
    {schemaVersion: undefined},
    {schemaVersion: "2"},
    {commitSha: "0".repeat(40)},
    {workflowRunId: "other"},
    {planId: "0".repeat(64)},
    {workflowRunAttempt: 0},
    {durationMs: Number.NaN},
    {executionStatus: "unknown"},
    {payload: null},
    {gate: {kind: "informational"}},
    {gateResult: "advisory"},
    {findings: [{kind: "line", severity: "error", file: "x", line: 0, column: 1, message: "x"}]},
  ])("rejects malformed/incompatible envelope %j", (patch) => {
    const planned = plan();
    expect(() => decodeProviderOutcome({...outcome(planned, "format"), ...patch}, planned)).toThrow();
  });
  it("does not permit passing metadata to conceal failed payloads or missing planned suites", () => {
    const planned = plan();
    expect(() =>
      decodeProviderOutcome({...outcome(planned, "format"), payload: {unformattedCount: 1, unformattedFiles: ["x.ts"]}}, planned),
    ).toThrow();
    expect(() =>
      decodeProviderOutcome(
        {...outcome(planned, "test-typescript"), payload: {totalTests: 0, passed: 0, failed: 0, skipped: 0, suites: []}},
        planned,
      ),
    ).toThrow();
  });
});

describe("nested outcome loading and reruns", () => {
  it("cannot pass nested runner errors hidden by empty envelope findings and zero failed assertions", async () => {
    const planned = plan();
    const suites = planned.suites.map((name) =>
      name === "scripts"
        ? runnerErrorSuite(name, "<vitest>", "Runner produced no report")
        : {name, totalTests: 0, passed: 0, failed: 0, skipped: 0, findings: []},
    );
    const claimedPass = outcome(planned, "test-typescript", {payload: aggregateSuites(suites), findings: []});
    for (const id of providerIds())
      await fs.writeJsonAtomic(join(directory, `outcome-${id}.json`), id === "test-typescript" ? claimedPass : outcome(planned, id));
    const loaded = await loadProviderOutcomes(directory, planned, 1);
    expect(buildVerifiedReport(context(), planned, loaded).overallResult).toBe("errored");
    expect(loaded.issues.some((issue) => issue.code === "invalid-outcome")).toBe(true);
    const failed = decodeProviderOutcome({...claimedPass, executionStatus: "failed", gateResult: "failed"}, planned);
    expect(failed.findings).toContainEqual(suites[0]?.findings[0]);
  });
  it("reuses compatible earlier attempts and prefers the newest compatible replacement", async () => {
    const planned = plan();
    for (const id of providerIds()) await fs.writeJsonAtomic(join(directory, `outcome-${id}`, `outcome-${id}.json`), outcome(planned, id));
    await fs.writeJsonAtomic(join(directory, "replacement", "outcome-format.json"), outcome(planned, "format", {workflowRunAttempt: 2}));
    const loaded = await loadProviderOutcomes(directory, planned, 2);
    expect(loaded.issues).toEqual([]);
    expect(loaded.outcomes).toHaveLength(6);
    expect(loaded.outcomes.find((value) => value.providerId === "format")?.workflowRunAttempt).toBe(2);
    expect(loaded.outcomes.find((value) => value.providerId === "lint")?.workflowRunAttempt).toBe(1);
  });
  it("retains valid earlier evidence but rejects a future attempt explicitly", async () => {
    const planned = plan();
    await fs.writeJsonAtomic(join(directory, "earlier", "outcome-format.json"), outcome(planned, "format"));
    await fs.writeJsonAtomic(join(directory, "future", "outcome-format.json"), outcome(planned, "format", {workflowRunAttempt: 3}));
    const loaded = await loadProviderOutcomes(directory, planned, 2);
    expect(loaded.issues.some((issue) => issue.code === "future-attempt")).toBe(true);
    expect(loaded.outcomes.find((value) => value.providerId === "format")?.workflowRunAttempt).toBe(1);
  });
  it("rejects duplicate provider/attempt evidence even when bytes agree", async () => {
    const planned = plan();
    for (const name of ["first", "second"])
      await fs.writeJsonAtomic(join(directory, name, "outcome-format.json"), outcome(planned, "format"));
    const loaded = await loadProviderOutcomes(directory, planned, 1);
    expect(loaded.issues.some((issue) => issue.code === "duplicate-outcome")).toBe(true);
    expect(
      loaded.issues
        .filter((issue) => issue.code === "duplicate-outcome")
        .every((issue) => issue.sourcePath?.endsWith("outcome-format.json")),
    ).toBe(true);
    expect(loaded.outcomes.some((value) => value.providerId === "format")).toBe(false);
  });
  it("keeps good records alongside invalid JSON, unversioned records, and missing identities", async () => {
    const planned = plan();
    await fs.writeJsonAtomic(join(directory, "outcome-format.json"), outcome(planned, "format"));
    await fs.writeText(join(directory, "outcome-lint.json"), "{not json");
    await fs.writeJsonAtomic(join(directory, "outcome-stats.json"), {...outcome(planned, "stats"), schemaVersion: undefined});
    const loaded = await loadProviderOutcomes(directory, planned, 1);
    expect(loaded.outcomes.map((value) => value.providerId)).toEqual(["format"]);
    expect(loaded.issues.filter((issue) => issue.code === "invalid-outcome")).toHaveLength(2);
    expect(loaded.issues.some((issue) => issue.code === "missing-outcome" && issue.providerId === "test-typescript")).toBe(true);
  });
});
