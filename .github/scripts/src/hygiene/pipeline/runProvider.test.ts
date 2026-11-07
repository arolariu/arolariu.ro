import {mkdtemp, rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {fs} from "../../../helpers/filesystem/index.ts";
import {context} from "../../../lib/planning/fixtures/plans.ts";
import {plan} from "../../../lib/hygiene/fixtures/outcomes.ts";
import {decodeProviderOutcome} from "../../../lib/hygiene/outcomes.ts";
import {formatPayloadSchema} from "../../../lib/hygiene/payloads.ts";
import {providerDescriptor} from "../../../lib/hygiene/registry.ts";
import type {CheckProvider} from "../../../lib/hygiene/contracts.ts";
import {runProviderCore, type RunProviderDeps} from "./runProvider.ts";

let root: string;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "provider-launcher-"));
});
afterEach(async () => {
  await rm(root, {recursive: true, force: true});
});

function deps(provider: CheckProvider<unknown>, empty = false): RunProviderDeps {
  return {registry: [provider], context: context({workspaceRoot: root}), plan: plan(empty), env: {}};
}
function provider(): CheckProvider<unknown> {
  return {
    ...providerDescriptor("format"),
    payloadSchema: formatPayloadSchema,
    applicableTo: () => true,
    run: async () => ({payload: {unformattedCount: 0, unformattedFiles: []}, findings: []}),
  };
}
describe("plan-owned provider launcher", () => {
  it("persists validated versioned evidence after successful execution", async () => {
    const input = deps(provider());
    expect(await runProviderCore("format", input)).toBe(0);
    const evidence = await fs.readValidatedJson(
      join(root, "artifacts", "hygiene", "outcome-format.json"),
      (value) => decodeProviderOutcome(value, input.plan),
      1_000_000,
    );
    expect(evidence).toMatchObject({schemaVersion: "1", executionStatus: "passed", planId: input.plan.id});
  });
  it("records a planned skip without executing implementation code", async () => {
    const run = vi.fn(async () => {
      throw new Error("Must not run");
    });
    const input = deps({...provider(), run}, true);
    expect(await runProviderCore("format", input)).toBe(0);
    expect(run).not.toHaveBeenCalled();
  });
  it("does not let a local heuristic override selected plan work", async () => {
    const run = vi.fn(async () => ({payload: {unformattedCount: 0, unformattedFiles: []}, findings: []}));
    expect(await runProviderCore("format", deps({...provider(), applicableTo: () => false, run}))).toBe(0);
    expect(run).toHaveBeenCalledOnce();
  });
  it("persists operational errors and maps their gate result to nonzero", async () => {
    const input = deps({
      ...provider(),
      run: async () => {
        throw new Error("command failed");
      },
    });
    expect(await runProviderCore("format", input)).toBe(1);
    const evidence = await fs.readJson<unknown>(join(root, "artifacts", "hygiene", "outcome-format.json"));
    expect(evidence).toMatchObject({executionStatus: "errored", gateResult: "errored", error: {message: "command failed"}});
  });
  it("rejects an unknown provider rather than writing fabricated evidence", async () => {
    expect(await runProviderCore("unknown", deps(provider()))).toBe(1);
  });
});
