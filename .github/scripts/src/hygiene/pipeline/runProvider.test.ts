import {execFile} from "node:child_process";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {promisify} from "node:util";
import {afterEach, beforeEach, describe, expect, it} from "vitest";
import type {ChangeScope} from "../domain/changedFiles.ts";
import type {CheckProvider} from "../domain/provider.ts";
import {collectChangedFiles, runProviderCore, type RunProviderDeps} from "./runProvider.ts";

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
    repoOwner: "o",
    repoName: "r",
    env: {},
  },
  changeScope: "known",
  changedFiles: [],
});

const execFileAsync = promisify(execFile);

async function git(args: readonly string[]): Promise<void> {
  await execFileAsync("git", [...args], {cwd: tmpDir});
}

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

  it("exits with code 1 and writes outcome with gateResult='errored' when provider throws", async () => {
    const deps = baseDeps([errorProvider as CheckProvider<unknown>]);
    const exitCode = await runProviderCore("boom", deps);
    expect(exitCode).toBe(1); // non-zero so step UI shows warning under continue-on-error
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

  it("exits with code 1 when gate result is 'failed' (blocking gate hit by an error finding)", async () => {
    const failingProvider: CheckProvider<null> = {
      id: "lint-stub",
      name: "LintStub",
      icon: "🔍",
      defaultGate: {kind: "blocking", blockOn: "error"},
      payloadSchema: {parse: () => null},
      applicableTo: () => true,
      async run() {
        return {
          payload: null,
          findings: [{kind: "line", severity: "error", file: "x.ts", line: 1, column: 1, message: "boom"}],
        };
      },
    };
    const deps = baseDeps([failingProvider as CheckProvider<unknown>]);
    const exitCode = await runProviderCore("lint-stub", deps);
    expect(exitCode).toBe(1);
    const file = path.join(tmpDir, "artifacts/hygiene/outcome-lint-stub.json");
    const content = JSON.parse(await fs.readFile(file, "utf-8"));
    expect(content.gateResult).toBe("failed");
  });

  it("exits with code 0 when gate result is 'advisory' (informational findings)", async () => {
    const advisoryProvider: CheckProvider<null> = {
      id: "stats-stub",
      name: "StatsStub",
      icon: "📊",
      defaultGate: {kind: "advisory"},
      payloadSchema: {parse: () => null},
      applicableTo: () => true,
      async run() {
        return {
          payload: null,
          findings: [{kind: "metric", severity: "info", name: "x", value: 1, message: "y"}],
        };
      },
    };
    const deps = baseDeps([advisoryProvider as CheckProvider<unknown>]);
    const exitCode = await runProviderCore("stats-stub", deps);
    expect(exitCode).toBe(0);
    const file = path.join(tmpDir, "artifacts/hygiene/outcome-stats-stub.json");
    const content = JSON.parse(await fs.readFile(file, "utf-8"));
    expect(content.gateResult).toBe("advisory");
  });

  it("passes changed files and scope to applicableTo and run", async () => {
    const seen: Array<{readonly scope: ChangeScope; readonly files: readonly string[]}> = [];
    const provider: CheckProvider<null> = {
      id: "scope",
      name: "Scope",
      icon: "🔬",
      defaultGate: {kind: "blocking", blockOn: "error"},
      payloadSchema: {parse: () => null},
      applicableTo(input) {
        seen.push({scope: input.changeScope, files: input.changedFiles});
        return true;
      },
      async run(input) {
        seen.push({scope: input.changeScope, files: input.changedFiles});
        return {payload: null, findings: []};
      },
    };

    const deps: RunProviderDeps = {
      ...baseDeps([provider as CheckProvider<unknown>]),
      changeScope: "known",
      changedFiles: ["sites/arolariu.ro/src/app/page.tsx"],
    };
    const exitCode = await runProviderCore("scope", deps);

    expect(exitCode).toBe(0);
    expect(seen).toEqual([
      {scope: "known", files: ["sites/arolariu.ro/src/app/page.tsx"]},
      {scope: "known", files: ["sites/arolariu.ro/src/app/page.tsx"]},
    ]);
  });

  it("writes a passed zero-finding outcome when provider is not applicable", async () => {
    const provider: CheckProvider<null> = {
      id: "skip",
      name: "Skip",
      icon: "⏭️",
      defaultGate: {kind: "blocking", blockOn: "error"},
      payloadSchema: {parse: () => null},
      applicableTo: () => false,
      async run() {
        throw new Error("run should not be called");
      },
    };

    const exitCode = await runProviderCore("skip", baseDeps([provider as CheckProvider<unknown>]));
    const content = JSON.parse(await fs.readFile(path.join(tmpDir, "artifacts/hygiene/outcome-skip.json"), "utf-8"));

    expect(exitCode).toBe(0);
    expect(content.gateResult).toBe("passed");
    expect(content.findings).toEqual([]);
  });
});

describe("collectChangedFiles", () => {
  it("returns normalized changed files for a successful git diff", async () => {
    await git(["init", "-b", "main"]);
    await fs.mkdir(path.join(tmpDir, "src"), {recursive: true});
    await fs.writeFile(path.join(tmpDir, "src", "a.ts"), "const a = 1;\n");
    await git(["add", "."]);
    await git(["-c", "user.email=test@example.com", "-c", "user.name=Test", "commit", "-m", "base"]);
    await fs.writeFile(path.join(tmpDir, "src", "a.ts"), "const a = 2;\n");
    await git(["add", "."]);
    await git(["-c", "user.email=test@example.com", "-c", "user.name=Test", "commit", "-m", "head"]);

    await expect(collectChangedFiles(tmpDir, "HEAD~1", "HEAD")).resolves.toEqual({
      scope: "known",
      files: ["src/a.ts"],
    });
  });

  it("returns unknown scope when git diff fails", async () => {
    await expect(collectChangedFiles(tmpDir, "missing-base", "missing-head")).resolves.toEqual({
      scope: "unknown",
      files: [],
    });
  });
});
