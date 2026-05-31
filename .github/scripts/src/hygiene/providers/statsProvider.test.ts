import {beforeEach, describe, expect, it, vi} from "vitest";
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
      if (args[0] === "diff" && args[1] === "--numstat") {
        return {exitCode: 0, stdout: "10\t2\tsites/arolariu.ro/src/page.tsx\n1\t0\tREADME.md\n", stderr: ""};
      }
      if (args[0] === "diff" && args[1] === "--name-only") {
        return {exitCode: 0, stdout: "sites/arolariu.ro/src/page.tsx\nREADME.md\n", stderr: ""};
      }
      if (args[0] === "ls-tree") {
        const folder = args[4] ?? "";
        const size = folder === "sites/arolariu.ro" ? 1000 : 500;
        return {exitCode: 0, stdout: `100644 blob abc ${size}\t${folder}/file.js\n`, stderr: ""};
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
