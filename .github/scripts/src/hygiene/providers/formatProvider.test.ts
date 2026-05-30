import {describe, it, expect, vi, beforeEach} from "vitest";
import {formatProvider, parsePrettierCheckOutput} from "./formatProvider.ts";
import type {FileFinding} from "../domain/types.ts";

describe("parsePrettierCheckOutput", () => {
  it("returns [] when output has no warnings", () => {
    const out = "All matched files use Prettier code style!\n";
    expect(parsePrettierCheckOutput(out)).toEqual([]);
  });

  it("parses 'Code style issues found' format (prettier v3)", () => {
    const out = [
      "Checking formatting...",
      "[warn] src/foo.ts",
      "[warn] sites/arolariu.ro/src/bar.tsx",
      "[warn] Code style issues found in 2 files. Run Prettier to fix.",
    ].join("\n");
    const files = parsePrettierCheckOutput(out);
    expect(files).toEqual(["src/foo.ts", "sites/arolariu.ro/src/bar.tsx"]);
  });

  it("ignores summary lines that start with [warn] but are not file paths", () => {
    const out = "[warn] Code style issues found in 0 files. Run Prettier to fix.\n";
    expect(parsePrettierCheckOutput(out)).toEqual([]);
  });
});

describe("formatProvider metadata", () => {
  it("has stable identity fields", () => {
    expect(formatProvider.id).toBe("format");
    expect(formatProvider.name).toBe("Prettier");
    expect(formatProvider.icon).toBe("🎨");
    expect(formatProvider.defaultGate).toEqual({kind: "blocking", blockOn: "warning"});
  });

  it("is applicable to any input", () => {
    expect(formatProvider.applicableTo({
      workspaceRoot: "/", baseRef: "main", headRef: "h", changedFiles: [], env: {},
    })).toBe(true);
  });

  it("payloadSchema accepts {unformattedCount, unformattedFiles}", () => {
    expect(formatProvider.payloadSchema.parse({unformattedCount: 0, unformattedFiles: []}))
      .toEqual({unformattedCount: 0, unformattedFiles: []});
    expect(() => formatProvider.payloadSchema.parse({unformattedCount: "x"})).toThrow();
  });
});

describe("formatProvider.run", () => {
  beforeEach(() => vi.resetModules());

  it("returns 0 findings and 'clean' payload when prettier exits 0", async () => {
    vi.doMock("@actions/exec", () => ({
      getExecOutput: vi.fn().mockResolvedValue({
        exitCode: 0,
        stdout: "All matched files use Prettier code style!\n",
        stderr: "",
      }),
    }));
    const {formatProvider: provider} = await import("./formatProvider.ts");
    const result = await provider.run({
      workspaceRoot: "/tmp", baseRef: "main", headRef: "HEAD", changedFiles: [], env: {},
    });
    expect(result.findings).toEqual([]);
    expect(result.payload).toEqual({unformattedCount: 0, unformattedFiles: []});
  });

  it("returns FileFindings when prettier reports unformatted files", async () => {
    vi.doMock("@actions/exec", () => ({
      getExecOutput: vi.fn().mockResolvedValue({
        exitCode: 1,
        stdout: "",
        stderr: "[warn] src/a.ts\n[warn] src/b.ts\n[warn] Code style issues found in 2 files.\n",
      }),
    }));
    const {formatProvider: provider} = await import("./formatProvider.ts");
    const result = await provider.run({
      workspaceRoot: "/tmp", baseRef: "main", headRef: "HEAD", changedFiles: [], env: {},
    });
    expect(result.findings).toHaveLength(2);
    expect(result.findings[0]?.kind).toBe("file");
    const first = result.findings[0] as FileFinding;
    expect(first.file).toBe("src/a.ts");
    expect(first.severity).toBe("warning");
    expect(result.payload.unformattedCount).toBe(2);
    expect(result.payload.unformattedFiles).toEqual(["src/a.ts", "src/b.ts"]);
  });
});
