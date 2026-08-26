import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {beforeEach, describe, expect, it, vi} from "vitest";
import type {LineFinding} from "../domain/types.ts";
import {lintProvider, parseEslintJson, type EslintFileResult} from "./lintProvider.ts";

describe("parseEslintJson", () => {
  it("returns [] for empty results", () => {
    expect(parseEslintJson([])).toEqual({findings: [], errorCount: 0, warningCount: 0});
  });

  it("flattens messages into LineFindings", () => {
    const eslintOutput: EslintFileResult[] = [
      {
        filePath: "/workspace/src/foo.ts",
        errorCount: 1,
        warningCount: 1,
        messages: [
          {line: 10, column: 5, severity: 2, message: "Unused var", ruleId: "no-unused-vars"},
          {line: 20, column: 3, severity: 1, message: "Prefer const", ruleId: "prefer-const"},
        ],
      },
    ];
    const result = parseEslintJson(eslintOutput);
    expect(result.errorCount).toBe(1);
    expect(result.warningCount).toBe(1);
    expect(result.findings).toHaveLength(2);
    expect(result.findings[0]).toMatchObject({
      kind: "line",
      severity: "error",
      file: "/workspace/src/foo.ts",
      line: 10,
      column: 5,
      message: "Unused var",
      ruleId: "no-unused-vars",
    });
    expect(result.findings[1]?.severity).toBe("warning");
  });

  it("maps severity 0 (off) to info", () => {
    const out: EslintFileResult[] = [
      {
        filePath: "/x.ts",
        errorCount: 0,
        warningCount: 0,
        messages: [{line: 1, column: 1, severity: 0, message: "msg", ruleId: null}],
      },
    ];
    const result = parseEslintJson(out);
    expect(result.findings[0]?.severity).toBe("info");
  });

  it("handles missing ruleId", () => {
    const out: EslintFileResult[] = [
      {
        filePath: "/x.ts",
        errorCount: 1,
        warningCount: 0,
        messages: [{line: 1, column: 1, severity: 2, message: "Parsing error", ruleId: null}],
      },
    ];
    const first = result(out).findings[0];
    expect(first?.kind).toBe("line");
    if (first?.kind === "line") {
      expect(first.ruleId).toBeUndefined();
    }
    function result(o: EslintFileResult[]) {
      return parseEslintJson(o);
    }
  });
});

describe("lintProvider metadata", () => {
  it("identity fields", () => {
    expect(lintProvider.id).toBe("lint");
    expect(lintProvider.name).toBe("ESLint");
    expect(lintProvider.icon).toBe("🔍");
    expect(lintProvider.defaultGate).toEqual({kind: "blocking", blockOn: "error"});
  });

  it("is not applicable when known changes contain no lintable files", () => {
    expect(
      lintProvider.applicableTo({
        workspaceRoot: "/w",
        baseRef: "main",
        headRef: "HEAD",
        changeScope: "known",
        changedFiles: ["README.md"],
        env: {},
      }),
    ).toBe(false);
  });

  it("is applicable for unknown scope and lintable files", () => {
    expect(
      lintProvider.applicableTo({
        workspaceRoot: "/w",
        baseRef: "main",
        headRef: "HEAD",
        changeScope: "unknown",
        changedFiles: [],
        env: {},
      }),
    ).toBe(true);
    expect(
      lintProvider.applicableTo({
        workspaceRoot: "/w",
        baseRef: "main",
        headRef: "HEAD",
        changeScope: "known",
        changedFiles: ["src/a.ts"],
        env: {},
      }),
    ).toBe(true);
  });
});

describe("lintProvider.run", () => {
  beforeEach(() => vi.resetModules());

  it("parses ESLint JSON output into findings", async () => {
    const eslintJson = JSON.stringify([
      {
        filePath: "/w/src/a.ts",
        errorCount: 1,
        warningCount: 0,
        messages: [{line: 5, column: 3, severity: 2, message: "Bad", ruleId: "x/y"}],
      },
    ]);
    vi.doMock("@actions/exec", () => ({
      getExecOutput: vi.fn().mockResolvedValue({exitCode: 1, stdout: eslintJson, stderr: ""}),
    }));
    const {lintProvider: provider} = await import("./lintProvider.ts");
    const result = await provider.run({
      workspaceRoot: "/w",
      baseRef: "main",
      headRef: "HEAD",
      changeScope: "unknown",
      changedFiles: [],
      env: {},
    });
    expect(result.findings).toHaveLength(1);
    const f = result.findings[0] as LineFinding;
    expect(f.file).toBe("/w/src/a.ts");
    expect(f.ruleId).toBe("x/y");
    expect(result.payload.errorCount).toBe(1);
    expect(result.payload.warningCount).toBe(0);
  });

  it("returns clean payload when ESLint exits 0 with empty array", async () => {
    vi.doMock("@actions/exec", () => ({
      getExecOutput: vi.fn().mockResolvedValue({exitCode: 0, stdout: "[]", stderr: ""}),
    }));
    const {lintProvider: provider} = await import("./lintProvider.ts");
    const result = await provider.run({
      workspaceRoot: "/w",
      baseRef: "main",
      headRef: "HEAD",
      changeScope: "unknown",
      changedFiles: [],
      env: {},
    });
    expect(result.findings).toEqual([]);
    expect(result.payload.errorCount).toBe(0);
  });

  it("runs ESLint only on changed lintable files for known scoped changes", async () => {
    const getExecOutput = vi.fn().mockResolvedValue({exitCode: 0, stdout: "[]", stderr: ""});
    vi.doMock("@actions/exec", () => ({getExecOutput}));
    const {lintProvider: provider} = await import("./lintProvider.ts");
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "lint-provider-test-"));
    const relativeFile = "sites/arolariu.ro/src/app/page.tsx";
    await fs.mkdir(path.join(workspaceRoot, "sites", "arolariu.ro", "src", "app"), {recursive: true});
    await fs.writeFile(path.join(workspaceRoot, ...relativeFile.split("/")), "export {};\n");

    try {
      await provider.run({
        workspaceRoot,
        baseRef: "main",
        headRef: "HEAD",
        changeScope: "known",
        changedFiles: [relativeFile, "sites/arolariu.ro/src/app/deleted.ts", "README.md"],
        env: {},
      });

      expect(getExecOutput).toHaveBeenCalledWith("npx", ["eslint", relativeFile, "--format", "json"], {
        cwd: workspaceRoot,
        ignoreReturnCode: true,
        silent: true,
      });
    } finally {
      await fs.rm(workspaceRoot, {recursive: true, force: true});
    }
  });

  it("returns a clean result without invoking ESLint for deletion-only scoped changes", async () => {
    const getExecOutput = vi.fn();
    vi.doMock("@actions/exec", () => ({getExecOutput}));
    const {lintProvider: provider} = await import("./lintProvider.ts");
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "lint-provider-test-"));

    try {
      const result = await provider.run({
        workspaceRoot,
        baseRef: "main",
        headRef: "HEAD",
        changeScope: "known",
        changedFiles: ["sites/arolariu.ro/src/app/deleted.ts"],
        env: {},
      });

      expect(getExecOutput).not.toHaveBeenCalled();
      expect(result).toEqual({
        payload: {errorCount: 0, warningCount: 0, filesChecked: 0},
        findings: [],
      });
    } finally {
      await fs.rm(workspaceRoot, {recursive: true, force: true});
    }
  });
});
