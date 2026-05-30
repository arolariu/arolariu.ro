import {describe, it, expect, beforeEach, afterEach} from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import {runProviderCore, type RunProviderDeps} from "./runProvider.ts";
import type {CheckProvider} from "../domain/provider.ts";

const stubProvider: CheckProvider<{ok: boolean}> = {
  id: "stub",
  name: "Stub",
  icon: "🧪",
  defaultGate: {kind: "blocking", blockOn: "error"},
  payloadSchema: {parse: (d) => d as {ok: boolean}},
  applicableTo: () => true,
  async run() {
    return {payload: {ok: true}, findings: []};
  },
};

const errorProvider: CheckProvider<null> = {
  id: "boom",
  name: "Boom",
  icon: "💥",
  defaultGate: {kind: "blocking", blockOn: "error"},
  payloadSchema: {parse: () => null},
  applicableTo: () => true,
  async run() {
    throw new Error("kaboom");
  },
};

let tmpDir: string;
beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "hygiene-test-"));
});
afterEach(async () => {
  await fs.rm(tmpDir, {recursive: true, force: true});
});

const baseDeps = (registry: CheckProvider<unknown>[]): RunProviderDeps => ({
  registry,
  context: {
    workspaceRoot: tmpDir,
    baseRef: "main",
    headRef: "HEAD",
    prNumber: null,
    workflowRunId: "1",
    workflowRunUrl: "https://example/run/1",
    repoOwner: "o", repoName: "r",
    env: {},
  },
  changedFiles: [],
});

describe("runProviderCore", () => {
  it("writes outcome-{id}.json on success", async () => {
    const deps = baseDeps([stubProvider as CheckProvider<unknown>]);
    const exitCode = await runProviderCore("stub", deps);
    expect(exitCode).toBe(0);
    const file = path.join(tmpDir, "artifacts/hygiene/outcome-stub.json");
    const content = JSON.parse(await fs.readFile(file, "utf-8"));
    expect(content.providerId).toBe("stub");
    expect(content.gateResult).toBe("passed");
    expect(content.error).toBeNull();
    expect(content.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("writes outcome with gateResult='errored' when provider throws", async () => {
    const deps = baseDeps([errorProvider as CheckProvider<unknown>]);
    const exitCode = await runProviderCore("boom", deps);
    expect(exitCode).toBe(0); // always exit 0 -- gate decides
    const file = path.join(tmpDir, "artifacts/hygiene/outcome-boom.json");
    const content = JSON.parse(await fs.readFile(file, "utf-8"));
    expect(content.gateResult).toBe("errored");
    expect(content.error.message).toBe("kaboom");
  });

  it("exits with code 1 when provider id is unknown", async () => {
    const deps = baseDeps([stubProvider as CheckProvider<unknown>]);
    const exitCode = await runProviderCore("nonexistent", deps);
    expect(exitCode).toBe(1);
  });
});
