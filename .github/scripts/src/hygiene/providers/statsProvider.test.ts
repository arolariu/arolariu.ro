import {mkdtemp, rm, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {pathToFileURL} from "node:url";
import {afterAll, beforeAll, beforeEach, describe, expect, it, vi} from "vitest";
import {getExecOutput} from "../../../helpers/sdk/exec.ts";
import {computeTopDirectories, computeTopExtensions, type FolderSize, foldersToComparisons} from "./statsProvider.ts";

describe("computeTopExtensions", () => {
  it("returns extensions sorted by count desc, top 5", () => {
    const files = ["a.ts", "b.ts", "c.tsx", "d.md", "e.md", "f.yaml", "g.json", "h.ts"];
    const result = computeTopExtensions(files, 5);
    expect(result[0]).toEqual({extension: "ts", count: 3});
    expect(result.length).toBeLessThanOrEqual(5);
  });

  it("classifies files with no extension as '(no extension)'", () => {
    const result = computeTopExtensions(["LICENSE"], 5);
    expect(result[0]?.extension).toBe("(no extension)");
  });
});

describe("computeTopDirectories", () => {
  it("groups by first path segment", () => {
    const files = ["sites/a/x.ts", "sites/a/y.ts", "sites/b/z.ts", "infra/main.bicep"];
    const result = computeTopDirectories(files, 5);
    expect(result[0]).toEqual({directory: "sites", count: 3});
  });

  it("handles root-level files", () => {
    const result = computeTopDirectories(["README.md"], 5);
    expect(result[0]?.directory).toBe("(root)");
  });
});

describe("foldersToComparisons", () => {
  it("creates a ComparisonFinding per folder with non-zero diff", () => {
    const folders: FolderSize[] = [
      {folder: "sites/arolariu.ro", mainTotal: 1000, headTotal: 1500},
      {folder: "sites/docs.arolariu.ro", mainTotal: 200, headTotal: 100},
    ];
    const findings = foldersToComparisons(folders);
    expect(findings).toHaveLength(2);
    expect(findings[0]).toMatchObject({
      kind: "comparison",
      severity: "info",
      name: "bundle.sites/arolariu.ro",
      baseValue: 1000,
      headValue: 1500,
      diff: 500,
      unit: "B",
    });
    expect(findings[1]?.diff).toBe(-100);
  });

  it("suppresses folders where the bundle size did not change (diff = 0)", () => {
    const folders: FolderSize[] = [
      {folder: "sites/arolariu.ro", mainTotal: 1000, headTotal: 1500},
      {folder: "sites/api.arolariu.ro", mainTotal: 500, headTotal: 500}, // unchanged → suppressed
      {folder: "sites/docs.arolariu.ro", mainTotal: 200, headTotal: 200}, // unchanged → suppressed
    ];
    const findings = foldersToComparisons(folders);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.name).toBe("bundle.sites/arolariu.ro");
  });

  it("returns [] when every folder has zero diff", () => {
    const folders: FolderSize[] = [
      {folder: "a", mainTotal: 100, headTotal: 100},
      {folder: "b", mainTotal: 200, headTotal: 200},
    ];
    expect(foldersToComparisons(folders)).toEqual([]);
  });
});

describe("statsProvider metadata", () => {
  beforeEach(() => vi.resetModules());
  it("informational gate -- never fails", async () => {
    const {statsProvider} = await import("./statsProvider.ts");
    expect(statsProvider.id).toBe("stats");
    expect(statsProvider.defaultGate).toEqual({kind: "informational"});
  });
});

describe("statsProvider.run", () => {
  beforeEach(() => vi.resetModules());

  function mockExec(): {readonly getExecOutput: ReturnType<typeof vi.fn>} {
    const getExecOutput = vi.fn(async (_command: string, args: readonly string[]) => {
      if (args[0] === "fetch") return {exitCode: 0, stdout: "", stderr: ""};
      if (args[0] === "merge-base") return {exitCode: 0, stdout: "b".repeat(40), stderr: ""};
      if (args[0] === "diff" && args[1] === "--shortstat") {
        return {exitCode: 0, stdout: "2 files changed, 11 insertions(+), 2 deletions(-)", stderr: ""};
      }
      if (args[0] === "diff" && args[1] === "--name-only") {
        return {exitCode: 0, stdout: "sites/arolariu.ro/src/page.tsx\0README.md\0", stderr: ""};
      }
      if (args[0] === "ls-tree") {
        const folder = args.at(-1) ?? "";
        const size = folder === "sites/arolariu.ro" ? 1000 : 500;
        return {exitCode: 0, stdout: `100644 blob abc ${size}\t${folder}/file.js\0`, stderr: ""};
      }
      return {exitCode: 0, stdout: "", stderr: ""};
    });
    vi.doMock("@actions/exec", () => ({getExecOutput}));
    return {getExecOutput};
  }

  it("uses input changedFiles for top extension and directory stats when scope is known", async () => {
    const {getExecOutput} = mockExec();
    const {statsProvider} = await import("./statsProvider.ts");

    const result = await statsProvider.run({
      workspaceRoot: "/w",
      baseRef: "main",
      headRef: "HEAD",
      changeScope: "known",
      changedFiles: ["sites/arolariu.ro/src/page.tsx", "README.md"],
      env: {},
    });

    expect(result.payload.filesChanged).toBe(2);
    expect(result.payload.topExtensions.map((x) => x.extension)).toContain("tsx");
    expect(result.payload.topDirectories[0]).toEqual({directory: "sites", count: 1});
    expect(getExecOutput).not.toHaveBeenCalledWith("git", ["diff", "--name-only", "main...HEAD"], expect.anything());
  });

  it("compares only touched bundle folders for known scoped changes", async () => {
    mockExec();
    const {statsProvider} = await import("./statsProvider.ts");

    const result = await statsProvider.run({
      workspaceRoot: "/w",
      baseRef: "main",
      headRef: "HEAD",
      changeScope: "known",
      changedFiles: ["sites/arolariu.ro/src/page.tsx"],
      env: {},
    });

    expect(result.payload.bundleSizes.map((x) => x.folder)).toEqual(["sites/arolariu.ro"]);
  });

  it("compares every configured bundle folder for unknown scope", async () => {
    mockExec();
    const {statsProvider} = await import("./statsProvider.ts");

    const result = await statsProvider.run({
      workspaceRoot: "/w",
      baseRef: "main",
      headRef: "HEAD",
      changeScope: "unknown",
      changedFiles: [],
      env: {},
    });

    expect(result.payload.bundleSizes.map((x) => x.folder)).toEqual([
      "sites/arolariu.ro",
      "sites/api.arolariu.ro",
      "sites/docs.arolariu.ro",
    ]);
  });
});

describe("statsProvider.run on a full-history checkout", () => {
  let root = "";
  let workspace = "";
  let mainTip = "";
  let headTip = "";

  async function git(cwd: string, ...args: string[]): Promise<string> {
    return (await getExecOutput("git", args, {cwd, silent: true})).stdout.trim();
  }

  // Release topology: main merged preview with --no-ff, then preview gained work without that merge commit.
  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), "ci-stats-provider-"));
    const remote = join(root, "remote");
    workspace = join(root, "workspace");
    await git(root, "init", "--initial-branch=main", remote);
    await git(remote, "config", "user.name", "CI fixture");
    await git(remote, "config", "user.email", "fixture@example.invalid");
    await git(remote, "config", "commit.gpgsign", "false");
    await git(remote, "config", "core.autocrlf", "false");
    await writeFile(join(remote, "README.md"), "base\n");
    await git(remote, "add", ".");
    await git(remote, "commit", "-m", "base");
    await git(remote, "switch", "-c", "preview");
    await writeFile(join(remote, "released.md"), "released\n");
    await git(remote, "add", ".");
    await git(remote, "commit", "-m", "released work");
    await git(remote, "switch", "main");
    await git(remote, "merge", "--no-ff", "-m", "release merge", "preview");
    mainTip = await git(remote, "rev-parse", "HEAD");
    await git(remote, "switch", "preview");
    await writeFile(join(remote, "follow-up.md"), "follow-up\n");
    await git(remote, "add", ".");
    await git(remote, "commit", "-m", "follow-up work");
    headTip = await git(remote, "rev-parse", "HEAD");
    await git(root, "clone", "--quiet", pathToFileURL(remote).href, workspace);
  }, 60_000);

  afterAll(async () => {
    if (root) await rm(root, {recursive: true, force: true, maxRetries: 3, retryDelay: 100});
  });

  beforeEach(() => {
    vi.doUnmock("@actions/exec");
    vi.resetModules();
  });

  it("finds the merge base when the head lacks main's merge commit and keeps the clone unshallow", async () => {
    const {statsProvider} = await import("./statsProvider.ts");

    const result = await statsProvider.run({
      workspaceRoot: workspace,
      baseRef: mainTip,
      headRef: headTip,
      changeScope: "unknown",
      changedFiles: [],
      env: {},
    });

    expect(result.executionStatus).toBe("passed");
    expect(result.payload).toMatchObject({filesChanged: 1, linesAdded: 1, linesDeleted: 0});
    expect(result.payload.topDirectories).toEqual([{directory: "(root)", count: 1}]);
    expect(await git(workspace, "rev-parse", "--is-shallow-repository")).toBe("false");
  }, 30_000);
});
