import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {beforeEach, describe, expect, it, vi} from "vitest";
import type {FileFinding} from "../domain/types.ts";
import {formatProvider, parsePrettierCheckOutput} from "./formatProvider.ts";

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

  it("is not applicable when known changes contain no Prettier-supported files", () => {
    expect(
      formatProvider.applicableTo({
        workspaceRoot: "/",
        baseRef: "main",
        headRef: "h",
        changeScope: "known",
        changedFiles: ["image.png"],
        env: {},
      }),
    ).toBe(false);
  });

  it("is applicable for unknown scope and Prettier-supported files", () => {
    expect(
      formatProvider.applicableTo({
        workspaceRoot: "/",
        baseRef: "main",
        headRef: "h",
        changeScope: "unknown",
        changedFiles: [],
        env: {},
      }),
    ).toBe(true);
    expect(
      formatProvider.applicableTo({
        workspaceRoot: "/",
        baseRef: "main",
        headRef: "h",
        changeScope: "known",
        changedFiles: ["src/a.ts"],
        env: {},
      }),
    ).toBe(true);
  });

  it("payloadSchema accepts {unformattedCount, unformattedFiles}", () => {
    expect(formatProvider.payloadSchema.parse({unformattedCount: 0, unformattedFiles: []})).toEqual({
      unformattedCount: 0,
      unformattedFiles: [],
    });
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
      workspaceRoot: "/tmp",
      baseRef: "main",
      headRef: "HEAD",
      changeScope: "unknown",
      changedFiles: [],
      env: {},
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
      workspaceRoot: "/tmp",
      baseRef: "main",
      headRef: "HEAD",
      changeScope: "unknown",
      changedFiles: [],
      env: {},
    });
    expect(result.findings).toHaveLength(2);
    expect(result.findings[0]?.kind).toBe("file");
    const first = result.findings[0] as FileFinding;
    expect(first.file).toBe("src/a.ts");
    expect(first.severity).toBe("warning");
    expect(result.payload.unformattedCount).toBe(2);
    expect(result.payload.unformattedFiles).toEqual(["src/a.ts", "src/b.ts"]);
  });

  it("runs Prettier only on changed supported files for known scoped changes", async () => {
    const getExecOutput = vi.fn().mockResolvedValue({
      exitCode: 0,
      stdout: "All matched files use Prettier code style!\n",
      stderr: "",
    });
    vi.doMock("@actions/exec", () => ({getExecOutput}));
    const {formatProvider: provider} = await import("./formatProvider.ts");
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "format-provider-test-"));
    const relativeFile = "sites/arolariu.ro/src/app/page.tsx";
    await fs.mkdir(path.join(workspaceRoot, "sites", "arolariu.ro", "src", "app"), {recursive: true});
    await fs.writeFile(path.join(workspaceRoot, ...relativeFile.split("/")), "export {};\n");

    try {
      await provider.run({
        workspaceRoot,
        baseRef: "main",
        headRef: "HEAD",
        changeScope: "known",
        changedFiles: [relativeFile, "sites/arolariu.ro/src/app/deleted.ts", "image.png"],
        env: {},
      });

      expect(getExecOutput).toHaveBeenCalledWith("npx", ["prettier", "--check", relativeFile], {
        cwd: workspaceRoot,
        ignoreReturnCode: true,
        silent: true,
      });
    } finally {
      await fs.rm(workspaceRoot, {recursive: true, force: true});
    }
  });

  it("returns a clean result without invoking Prettier for deletion-only scoped changes", async () => {
    const getExecOutput = vi.fn();
    vi.doMock("@actions/exec", () => ({getExecOutput}));
    const {formatProvider: provider} = await import("./formatProvider.ts");
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "format-provider-test-"));

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
        payload: {unformattedCount: 0, unformattedFiles: []},
        findings: [],
      });
    } finally {
      await fs.rm(workspaceRoot, {recursive: true, force: true});
    }
  });
});
