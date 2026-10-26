import {execFile} from "node:child_process";
import {mkdtemp, readFile, rm, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {promisify} from "node:util";
import {afterEach, beforeEach, describe, expect, it} from "vitest";
import {execChecked} from "../../../helpers/exec/index.ts";
import {createGitHelper} from "../../../helpers/git/index.ts";
import {fs} from "../../../helpers/filesystem/index.ts";
import {buildHygienePlan} from "../../../lib/planning/plan.ts";
import {context} from "../../../lib/planning/fixtures/plans.ts";
import {providerIds} from "../../../lib/hygiene/registry.ts";

const execFileAsync = promisify(execFile);
let root: string;
let sha: string;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "hygiene-cli-"));
  await execChecked("git", ["init", "-b", "main"], {cwd: root, silent: true});
  await writeFile(join(root, "file.txt"), "base");
  await execChecked("git", ["add", "."], {cwd: root, silent: true});
  await execChecked(
    "git",
    ["-c", "user.name=Test", "-c", "user.email=test@example.com", "-c", "commit.gpgsign=false", "commit", "-m", "base"],
    {cwd: root, silent: true},
  );
  sha = (await createGitHelper({cwd: root}).getCommit()).sha;
  await writeFile(join(root, "summary.md"), "");
});
afterEach(async () => {
  await rm(root, {recursive: true, force: true});
});

async function native(entry: string, args: readonly string[]): Promise<{exitCode: number; stdout: string; stderr: string}> {
  const env = {
    ...process.env,
    GITHUB_TOKEN: "",
    GITHUB_WORKSPACE: root,
    GITHUB_REPOSITORY: "owner/repo",
    GITHUB_RUN_ID: "123",
    GITHUB_RUN_ATTEMPT: "1",
    GITHUB_RUN_NUMBER: "9",
    GITHUB_WORKFLOW: "Hygiene",
    GITHUB_EVENT_NAME: "pull_request",
    RUN_ID: "123",
    RUN_ATTEMPT: "1",
    RUN_NUMBER: "9",
    WORKFLOW: "Hygiene",
    EVENT_NAME: "pull_request",
    HEAD_REF: sha,
    BASE_REF: sha,
    PR_NUMBER: "",
    GITHUB_STEP_SUMMARY: join(root, "summary.md"),
  };
  try {
    const result = await execFileAsync(process.execPath, [fileURLToPath(new URL(`./${entry}.ts`, import.meta.url)), ...args], {
      cwd: root,
      env,
      timeout: 30_000,
    });
    return {exitCode: 0, ...result};
  } catch (error) {
    if (
      error instanceof Error
      && "code" in error
      && typeof error.code === "number"
      && "stdout" in error
      && typeof error.stdout === "string"
      && "stderr" in error
      && typeof error.stderr === "string"
    )
      return {exitCode: error.code, stdout: error.stdout, stderr: error.stderr};
    throw error;
  }
}

describe("native required-plan CLI transport", () => {
  it("does not accept a missing plan on either real launcher", async () => {
    expect((await native("runProvider", ["format"])).exitCode).not.toBe(0);
    expect((await native("runProjections", [])).exitCode).not.toBe(0);
  });
  it("writes six explicit versioned skips and a validated passing report for known-empty scope", async () => {
    const ctx = context({workspaceRoot: root, commitSha: sha, headRef: sha, baseRef: sha});
    const plan = buildHygienePlan({
      context: ctx,
      mode: "affected",
      changes: {scope: "known", baseSha: sha, headSha: sha, entries: []},
      workspace: {kind: "unavailable", reason: "not needed", durationMs: 0},
      sharedInputs: [],
    });
    const path = join(root, "artifacts", "hygiene", "plan.json");
    await fs.writeJsonAtomic(path, plan);
    for (const id of providerIds()) {
      const result = await native("runProvider", [id, "--plan", path]);
      expect(result.exitCode, result.stderr).toBe(0);
    }
    const projected = await native("runProjections", ["--plan", path]);
    expect(projected.exitCode, projected.stderr).toBe(0);
    const report: unknown = JSON.parse(await readFile(join(root, "artifacts", "hygiene", "hygiene-report.json"), "utf8"));
    expect(report).toMatchObject({schemaVersion: "3", overallResult: "passed"});
    if (typeof report !== "object" || report === null || !("outcomes" in report) || !Array.isArray(report.outcomes))
      throw new Error("Invalid report");
    expect(report.outcomes).toHaveLength(6);
    expect(
      report.outcomes.every(
        (value: unknown) =>
          typeof value === "object" && value !== null && "executionStatus" in value && value.executionStatus === "skipped",
      ),
    ).toBe(true);
    await fs.remove(join(root, "artifacts", "hygiene", "outcome-format.json"), {recursive: false, force: true});
    expect((await native("runProjections", ["--plan", path])).exitCode).not.toBe(0);
  }, 60_000);
});
