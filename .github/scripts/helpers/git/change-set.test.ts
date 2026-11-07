import {mkdir, mkdtemp, rename, rm, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {afterAll, beforeAll, describe, expect, it} from "vitest";
import {getExecOutput} from "../sdk/exec.ts";
import {createGitHelper} from "./index.ts";

let directory: string;
let base: string;

async function git(...args: string[]): Promise<string> {
  return (await getExecOutput("git", args, {cwd: directory, silent: true})).stdout.trim();
}

beforeAll(async () => {
  directory = await mkdtemp(join(tmpdir(), "ci-git-changes-"));
  await git("init", "--initial-branch=main");
  await git("config", "user.name", "CI fixture");
  await git("config", "user.email", "fixture@example.invalid");
  await git("config", "commit.gpgsign", "false");
  await git("config", "core.autocrlf", "false");
  await mkdir(join(directory, "old project"));
  await writeFile(join(directory, "old project", "file.ts"), "unchanged contents\n");
  await writeFile(join(directory, "deleted.ts"), "removed\n");
  await git("add", ".");
  await git("commit", "-m", "base fixture");
  base = await git("rev-parse", "HEAD");
  await mkdir(join(directory, "new project"));
  await rename(join(directory, "old project", "file.ts"), join(directory, "new project", "file.ts"));
  await rm(join(directory, "deleted.ts"));
  await writeFile(join(directory, "added.ts"), "added\n");
  await git("add", "-A");
  await git("commit", "-m", "head fixture");
}, 60_000);

afterAll(async () => {
  if (directory) await rm(directory, {recursive: true, force: true, maxRetries: 3, retryDelay: 100});
});

describe("Git change evidence", () => {
  it("preserves rename origins, destinations, and deletions from a real repository", async () => {
    const helper = createGitHelper();
    expect(helper.getChangeSet).toBeTypeOf("function");
    const changes = await helper.getChangeSet(directory, base, "HEAD");
    expect(changes.scope).toBe("known");
    if (changes.scope !== "known") return;
    expect(changes.entries).toEqual(
      expect.arrayContaining([
        {kind: "renamed", previousPath: "old project/file.ts", path: "new project/file.ts"},
        {kind: "deleted", path: "deleted.ts"},
        {kind: "added", path: "added.ts"},
      ]),
    );
  });

  it("distinguishes a known empty comparison from an invalid reference", async () => {
    const helper = createGitHelper();
    expect(helper.getChangeSet).toBeTypeOf("function");
    expect(await helper.getChangeSet(directory, "HEAD", "HEAD")).toMatchObject({scope: "known", entries: []});
    expect(await helper.getChangeSet(directory, "missing-ref", "HEAD")).toMatchObject({scope: "unknown", reason: expect.any(String)});
  });
});
