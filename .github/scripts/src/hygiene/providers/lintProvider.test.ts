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
      changeScope: "known",
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
      changeScope: "known",
      changedFiles: [],
      env: {},
    });
    expect(result.findings).toEqual([]);
    expect(result.payload.errorCount).toBe(0);
  });
});
