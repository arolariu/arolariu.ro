import {describe, it, expect, beforeEach, afterEach} from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import {writeJsonArtifact} from "./jsonArtifact.ts";
import type {HygieneReport} from "../domain/types.ts";

let tmpDir: string;
beforeEach(async () => { tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "hyg-")); });
afterEach(async () => { await fs.rm(tmpDir, {recursive: true, force: true}); });

const report: HygieneReport = {
  schemaVersion: "3",
  commitSha: "abc",
  prNumber: 1,
  workflowRunId: "1",
  workflowRunUrl: "https://x/1",
  generatedAt: "2026-05-30T00:00:00.000Z",
  overallResult: "passed",
  outcomes: [],
};

describe("writeJsonArtifact", () => {
  it("writes hygiene-report.json under artifacts/hygiene/", async () => {
    await writeJsonArtifact(report, tmpDir);
    const file = path.join(tmpDir, "artifacts/hygiene/hygiene-report.json");
    const parsed = JSON.parse(await fs.readFile(file, "utf-8"));
    expect(parsed.schemaVersion).toBe("3");
    expect(parsed.commitSha).toBe("abc");
  });

  it("creates artifacts/hygiene dir if missing", async () => {
    await writeJsonArtifact(report, tmpDir);
    const stat = await fs.stat(path.join(tmpDir, "artifacts/hygiene"));
    expect(stat.isDirectory()).toBe(true);
  });
});
