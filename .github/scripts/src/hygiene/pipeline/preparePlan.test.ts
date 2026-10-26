import {mkdtemp, rm, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {afterEach, beforeEach, describe, expect, it} from "vitest";
import {execChecked} from "../../../helpers/exec/index.ts";
import {createGitHelper} from "../../../helpers/git/index.ts";
import {fs} from "../../../helpers/filesystem/index.ts";
import {decodeHygienePlan} from "../../../lib/planning/plan.ts";
import {context} from "../../../lib/planning/fixtures/plans.ts";
import {preparePlanCore} from "./preparePlan.ts";

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
  await rm(root, {recursive: true, force: true});
});

describe("persistent hygiene plan preparation", () => {
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
