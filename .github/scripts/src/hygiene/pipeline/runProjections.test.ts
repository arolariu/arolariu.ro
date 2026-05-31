import {describe, it, expect, beforeEach, afterEach, vi} from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import {loadOutcomes, runProjectionsCore, type Projection} from "./runProjections.ts";
import type {ProviderOutcome, HygieneReport} from "../domain/types.ts";

const passedOutcome: ProviderOutcome<unknown> = {
  providerId: "format", providerName: "Prettier", providerIcon: "🎨",
  gate: {kind: "blocking", blockOn: "error"}, gateResult: "passed",
  durationMs: 1, startedAt: "2026-05-30T00:00:00.000Z", finishedAt: "2026-05-30T00:00:00.001Z",
  payload: null, findings: [], error: null,
};

let tmpDir: string;
beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "rp-"));
  await fs.mkdir(path.join(tmpDir, "artifacts/hygiene"), {recursive: true});
});
afterEach(async () => { await fs.rm(tmpDir, {recursive: true, force: true}); });

describe("loadOutcomes", () => {
  it("loads all outcome-*.json files in the artifacts dir", async () => {
    await fs.writeFile(path.join(tmpDir, "artifacts/hygiene/outcome-format.json"), JSON.stringify(passedOutcome));
    await fs.writeFile(path.join(tmpDir, "artifacts/hygiene/outcome-lint.json"),
      JSON.stringify({...passedOutcome, providerId: "lint"}));
    const outcomes = await loadOutcomes(tmpDir);
    expect(outcomes.map((o) => o.providerId).sort()).toEqual(["format", "lint"]);
  });

  it("returns [] when dir does not exist", async () => {
    const empty = path.join(tmpDir, "doesnotexist");
    const outcomes = await loadOutcomes(empty);
    expect(outcomes).toEqual([]);
  });

  it("skips files that are not outcome-*.json", async () => {
    await fs.writeFile(path.join(tmpDir, "artifacts/hygiene/outcome-format.json"), JSON.stringify(passedOutcome));
    await fs.writeFile(path.join(tmpDir, "artifacts/hygiene/random.txt"), "hello");
    const outcomes = await loadOutcomes(tmpDir);
    expect(outcomes).toHaveLength(1);
  });
});

describe("runProjectionsCore", () => {
  const okProjection: Projection = {name: "ok", run: vi.fn().mockResolvedValue(undefined)};
  const failProjection: Projection = {name: "fail", run: vi.fn().mockRejectedValue(new Error("boom"))};

  const baseReport: HygieneReport = {
    schemaVersion: "3", commitSha: "x", prNumber: null,
    workflowRunId: "1", workflowRunUrl: "https://x/1",
    generatedAt: "2026-05-30T00:00:00.000Z",
    overallResult: "passed", outcomes: [],
  };

  it("returns exitCode 0 when overallResult is passed", async () => {
    const code = await runProjectionsCore(baseReport, [okProjection]);
    expect(code).toBe(0);
  });

  it("returns exitCode 0 when overallResult is advisory", async () => {
    const code = await runProjectionsCore({...baseReport, overallResult: "advisory"}, [okProjection]);
    expect(code).toBe(0);
  });

  it("returns exitCode 1 when overallResult is failed", async () => {
    const code = await runProjectionsCore({...baseReport, overallResult: "failed"}, [okProjection]);
    expect(code).toBe(1);
  });

  it("returns exitCode 1 when overallResult is errored", async () => {
    const code = await runProjectionsCore({...baseReport, overallResult: "errored"}, [okProjection]);
    expect(code).toBe(1);
  });

  it("runs all projections even if one fails (allSettled)", async () => {
    const okSpy: Projection = {name: "ok", run: vi.fn().mockResolvedValue(undefined)};
    const failSpy: Projection = {name: "fail", run: vi.fn().mockRejectedValue(new Error("x"))};
    await runProjectionsCore(baseReport, [failSpy, okSpy]);
    expect(okSpy.run).toHaveBeenCalled();
    expect(failSpy.run).toHaveBeenCalled();
  });

  it("a projection failure does not change exitCode if overallResult is passed", async () => {
    const code = await runProjectionsCore(baseReport, [failProjection]);
    expect(code).toBe(0);
  });
});
