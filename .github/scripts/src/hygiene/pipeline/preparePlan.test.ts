import {mkdtemp, rm, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {execChecked} from "../../../helpers/exec/index.ts";
import {createGitHelper} from "../../../helpers/git/index.ts";
import {fs} from "../../../helpers/filesystem/index.ts";
import {decodeHygienePlan} from "../../../lib/planning/plan.ts";
import {context} from "../../../lib/planning/fixtures/plans.ts";
import {main, preparePlanCore} from "./preparePlan.ts";

let root: string;
let sha: string;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "prepare-hygiene-"));
  await execChecked("git", ["init", "-b", "main"], {cwd: root, silent: true});
  await writeFile(join(root, "file.txt"), "base");
  await execChecked("git", ["add", "."], {cwd: root, silent: true});
  await execChecked(
    "git",
    ["-c", "user.name=Test", "-c", "user.email=test@example.com", "-c", "commit.gpgsign=false", "commit", "-m", "base"],
    {cwd: root, silent: true},
  );
  sha = (await createGitHelper({cwd: root}).getCommit()).sha;
});
afterEach(async () => {
  vi.unstubAllEnvs();
  await rm(root, {recursive: true, force: true});
});

describe("persistent hygiene plan preparation", () => {
  it("logs normal full-scope selection without warning annotations or raw reason codes", async () => {
    const outputs = join(root, "outputs.txt");
    await writeFile(outputs, "");
    for (const [key, value] of Object.entries({
      GITHUB_WORKSPACE: root,
      GITHUB_REPOSITORY: "owner/repo",
      GITHUB_RUN_ID: "123",
      GITHUB_RUN_NUMBER: "9",
      GITHUB_RUN_ATTEMPT: "1",
      GITHUB_WORKFLOW: "Hygiene",
      GITHUB_EVENT_NAME: "pull_request",
      HEAD_REF: sha,
      BASE_REF: sha,
      PR_NUMBER: "",
      GITHUB_OUTPUT: outputs,
      RUNNER_DEBUG: "0",
    }))
      vi.stubEnv(key, value);
    let output = "";
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
      output += String(chunk);
      return true;
    });
    try {
      await main(["--scope", "full"]);
    } finally {
      stdout.mockRestore();
    }

    expect(output).toContain("Full validation was explicitly requested.");
    expect(output).not.toMatch(/::warning|full-requested/);
    const stored = await fs.readValidatedJson(join(root, "artifacts", "hygiene", "plan.json"), decodeHygienePlan, 1_000_000);
    expect(stored.diagnostics).toContainEqual({code: "full-requested", message: "Full scope explicitly requested"});
  });
  it("persists a known-empty plan with six required skips without loading Nx", async () => {
    const plan = await preparePlanCore(context({workspaceRoot: root, commitSha: sha, baseRef: sha, headRef: sha}), "affected");
    expect(plan.providers).toHaveLength(6);
    expect(plan.providers.every((provider) => !provider.selected)).toBe(true);
    expect(await fs.readValidatedJson(join(root, "artifacts", "hygiene", "plan.json"), decodeHygienePlan, 1_000_000)).toEqual(plan);
  });
  it("persists full declared scope even when graph acquisition is unavailable", async () => {
    const plan = await preparePlanCore(context({workspaceRoot: root, commitSha: sha, baseRef: sha, headRef: sha}), "full");
    expect(plan.providers.every((provider) => provider.selected)).toBe(true);
    expect(plan.suites).toHaveLength(6);
    expect(plan.diagnostics.length).toBeGreaterThan(0);
  });
});
