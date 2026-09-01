// @vitest-environment node
/**
 * @fileoverview ESLint boundary and runtime immutability tests for the doctor pipeline.
 *
 * ESLint boundary tests execute the installed ESLint Linter API against minimal virtual
 * doctor-module sources using the actual exported flat config, rather than parsing config
 * source. Runtime immutability tests use bounded content snapshots of sentinel files so
 * that mutation (not merely creation) is detected.
 *
 * @module scripts/doctor.readonly.test
 */

import {createHash} from "node:crypto";
import {existsSync, readFileSync} from "node:fs";
import {execFileSync, spawn} from "node:child_process";
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {describe, expect, it, vi, beforeAll} from "vitest";
import {MonorepositoryConsoleLogger} from "./common/logger.ts";
import {createRepositoryPaths, type RepositoryPaths} from "./common/repository-paths.ts";
import type {RepositoryRequirements} from "./common/requirements.ts";
import {runDoctor} from "./doctor.ts";
import type {DiagnosticModule, DiagnosticModuleId, DiagnosticResult} from "./doctor.types.ts";
import type {RepositoryInspectionSession} from "./inspection/repository.ts";
import type {InspectionOutcome} from "./inspection/types.ts";

// ===== ESLint boundary batch runner =====

/**
 * All virtual doctor-module sources to lint. Each entry is [label, code, filename, expectViolation].
 * A single Node.js subprocess loads the ESLint config once and lints every source, avoiding
 * the ~8 s per-invocation startup cost of eslint-plugin-unicorn's web-worker bootstrap in
 * a Vitest worker thread.
 */
const BOUNDARY_CASES: readonly [string, string, string, boolean][] = [
  // Rejected imports
  ["execa", 'import {execa} from "execa";', "scripts/doctor.workspace.ts", true],
  ["node:child_process", 'import {spawn} from "node:child_process";', "scripts/doctor.workspace.ts", true],
  ["child_process-bare", 'import {execFile} from "child_process";', "scripts/doctor.workspace.ts", true],
  ["defaultCommandRunner", 'import {defaultCommandRunner} from "./common/process.ts";', "scripts/doctor.workspace.ts", true],
  ["CommandRunner-type", 'import type {CommandRunner} from "./common/process.ts";', "scripts/doctor.workspace.ts", true],
  ["fs-writeFile", 'import {writeFile} from "node:fs";', "scripts/doctor.workspace.ts", true],
  ["fs-writeFileSync", 'import {writeFileSync} from "node:fs";', "scripts/doctor.workspace.ts", true],
  ["fs-rm", 'import {rm} from "node:fs";', "scripts/doctor.workspace.ts", true],
  ["fs-rmSync", 'import {rmSync} from "node:fs";', "scripts/doctor.workspace.ts", true],
  ["fs-rename", 'import {rename} from "node:fs";', "scripts/doctor.workspace.ts", true],
  ["fs-renameSync", 'import {renameSync} from "node:fs";', "scripts/doctor.workspace.ts", true],
  ["fs-mkdir", 'import {mkdir} from "node:fs";', "scripts/doctor.workspace.ts", true],
  ["fs-mkdirSync", 'import {mkdirSync} from "node:fs";', "scripts/doctor.workspace.ts", true],
  ["fs-appendFile", 'import {appendFile} from "node:fs";', "scripts/doctor.workspace.ts", true],
  ["fs-appendFileSync", 'import {appendFileSync} from "node:fs";', "scripts/doctor.workspace.ts", true],
  ["fs-default", 'import fs from "node:fs";', "scripts/doctor.workspace.ts", true],
  ["fs-namespace", 'import * as fs from "node:fs";', "scripts/doctor.workspace.ts", true],
  ["fsp-writeFile", 'import {writeFile} from "node:fs/promises";', "scripts/doctor.workspace.ts", true],
  ["fsp-rm", 'import {rm} from "node:fs/promises";', "scripts/doctor.workspace.ts", true],
  ["fsp-rename", 'import {rename} from "node:fs/promises";', "scripts/doctor.workspace.ts", true],
  ["fsp-mkdir", 'import {mkdir} from "node:fs/promises";', "scripts/doctor.workspace.ts", true],
  ["fsp-appendFile", 'import {appendFile} from "node:fs/promises";', "scripts/doctor.workspace.ts", true],
  ["fsp-default", 'import fsp from "node:fs/promises";', "scripts/doctor.workspace.ts", true],
  ["fsp-namespace", 'import * as fsp from "node:fs/promises";', "scripts/doctor.workspace.ts", true],
  // Allowed read-only imports
  ["fs-constants", 'import {constants} from "node:fs";', "scripts/doctor.workspace.ts", false],
  ["fs-existsSync", 'import {existsSync} from "node:fs";', "scripts/doctor.workspace.ts", false],
  ["fs-readFileSync", 'import {readFileSync} from "node:fs";', "scripts/doctor.workspace.ts", false],
  ["fsp-access-readFile-stat", 'import {access, readFile, stat} from "node:fs/promises";', "scripts/doctor.workspace.ts", false],
  ["fsp-readdir", 'import {readdir} from "node:fs/promises";', "scripts/doctor.workspace.ts", false],
];

/**
 * Run all boundary lint cases in a single Node.js subprocess. The ESLint config is loaded
 * once, then `lintText` is called for each virtual source. Returns a label → violation-count map.
 */
function runBoundaryLintBatch(): ReadonlyMap<string, number> {
  const casesJson = JSON.stringify(BOUNDARY_CASES.map(([label, code, filename]) => [label, code, filename]));
  const script = `
    import {ESLint} from "eslint";
    const eslint = new ESLint();
    const cases = ${casesJson};
    const out = {};
    for (const [label, code, filename] of cases) {
      const r = await eslint.lintText(code + "\\n", {filePath: filename});
      out[label] = r[0].messages.filter(m => m.ruleId === "no-restricted-imports" && m.severity === 2).length;
    }
    process.stdout.write(JSON.stringify(out));
  `;
  const output = execFileSync(process.execPath, ["--input-type=module"], {
    input: script,
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 4 * 1024 * 1024,
    timeout: 120_000,
  });
  return new Map(Object.entries(JSON.parse(output) as Record<string, number>));
}

let boundaryResults: ReadonlyMap<string, number>;

// ===== Bounded filesystem snapshot =====

interface FileSnapshot {
  readonly exists: boolean;
  readonly contentHash: string | null;
}

/**
 * Bounded sentinel paths inside `.nx` and `.arolariu` that are cheap to hash and
 * representative of mutation. Does not recurse into `.nx/cache/<hash>/` trees.
 */
const SENTINEL_PATHS: readonly string[] = [
  ".arolariu/tooling.local.json",
  ".nx/cache/run.json",
  ".nx/workspace-data/lockfile-dependencies.hash",
  ".nx/workspace-data/lockfile-nodes.hash",
];

/** SHA-256 hex digest of a file, or `null` if the file does not exist. */
function hashFile(path: string): string | null {
  if (!existsSync(path)) return null;
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

/** Snapshot sentinel files under `root` as a path → content-hash map. */
function snapshotSentinelFiles(root: string): ReadonlyMap<string, FileSnapshot> {
  const map = new Map<string, FileSnapshot>();
  for (const rel of SENTINEL_PATHS) {
    const fullPath = resolve(root, rel);
    const h = hashFile(fullPath);
    map.set(rel, {exists: h !== null, contentHash: h});
  }
  return map;
}

// ===== Test fixtures =====

const MODULE_ORDER: readonly DiagnosticModuleId[] = ["workspace", "dotnet", "react", "svelte", "python", "infrastructure"];
const REPRESENTATIVE_ID: Readonly<Record<DiagnosticModuleId, string>> = {
  workspace: "workspace.repository-root",
  dotnet: "dotnet.executable",
  react: "react.packages",
  svelte: "svelte.cv.packages",
  python: "python.runtime",
  infrastructure: "infrastructure.selection",
};

function passCheck(id: string, module: DiagnosticModuleId): DiagnosticResult {
  return {id, module, name: id, status: "pass", summary: `${id} healthy.`, evidence: [], potentialCauses: [], fixes: [], durationMs: 1};
}

function createFakeModules(): Readonly<{modules: readonly DiagnosticModule[]}> {
  const modules = MODULE_ORDER.map((id): DiagnosticModule => ({
    id,
    title: id,
    run: async (): Promise<readonly DiagnosticResult[]> => [passCheck(REPRESENTATIVE_ID[id], id)],
  }));
  return {modules};
}

const FIXED_REPOSITORY_PATHS: RepositoryPaths = createRepositoryPaths(resolve("C:\\fixture\\arolariu.ro"));
const FIXED_REQUIREMENTS: RepositoryRequirements = {
  node: {major: 24, minor: 0, patch: 0},
  npm: {major: 11, minor: 0, patch: 0},
  dotnet: {major: 10, minor: 0, patch: 0},
  python: {major: 3, minor: 12, patch: 0},
  packages: new Map(),
};

function createFakeInspectionSession(): RepositoryInspectionSession {
  return {
    inspect: async (_key: string): Promise<InspectionOutcome<unknown>> => ({
      kind: "unavailable" as const,
      reason: "Fake session for immutability test",
      durationMs: 0,
    }),
    invalidate: (): void => {},
    updateInfrastructureEngine: (): void => {},
  } as unknown as RepositoryInspectionSession;
}

function fixedDependencies() {
  let tick = 0;
  return {
    resolveRepositoryPaths: () => FIXED_REPOSITORY_PATHS,
    loadRepositoryRequirements: async () => ({status: "valid" as const, requirements: FIXED_REQUIREMENTS}),
    network: {
      get: vi.fn(async () => ({status: "unavailable" as const, durationMs: 0, error: "Fake network probe"})),
    },
    platform: "win32" as NodeJS.Platform,
    arch: "x64",
    env: {} as NodeJS.ProcessEnv,
    now: () => (tick += 1),
    timestamp: () => "2026-08-31T00:00:00.000Z",
    inspection: createFakeInspectionSession(),
    probes: {
      run: vi.fn(async () => {
        throw new Error("Probes must not be invoked by fake modules.");
      }),
    },
    logger: new MonorepositoryConsoleLogger("doctor", {verbose: false}),
  };
}

// ===== ESLint boundary tests =====

describe("doctor ESLint boundary restrictions", () => {
  beforeAll(() => {
    boundaryResults = runBoundaryLintBatch();
  }, 120_000);

  /** Assert a case was rejected by the no-restricted-imports rule. */
  function expectRestricted(label: string): void {
    const count = boundaryResults.get(label);
    expect(count, `Expected violation for "${label}" but got ${count ?? "undefined"}`).toBeGreaterThan(0);
  }

  /** Assert a case was NOT flagged by the no-restricted-imports rule. */
  function expectAllowed(label: string): void {
    const count = boundaryResults.get(label);
    expect(count, `Unexpected violation for "${label}"`).toBe(0);
  }

  describe("rejected imports", () => {
    it("rejects execa imports in doctor modules", () => expectRestricted("execa"));
    it("rejects node:child_process imports in doctor modules", () => expectRestricted("node:child_process"));
    it("rejects child_process (bare alias) imports in doctor modules", () => expectRestricted("child_process-bare"));
    it("rejects defaultCommandRunner from process.ts in specialist modules", () => expectRestricted("defaultCommandRunner"));
    it("rejects CommandRunner type from process.ts in specialist modules", () => expectRestricted("CommandRunner-type"));

    it("rejects mutating node:fs named imports", () => {
      for (const suffix of [
        "writeFile",
        "writeFileSync",
        "rm",
        "rmSync",
        "rename",
        "renameSync",
        "mkdir",
        "mkdirSync",
        "appendFile",
        "appendFileSync",
      ]) {
        expectRestricted(`fs-${suffix}`);
      }
    });

    it("rejects default node:fs import (bypasses named-import restrictions)", () => expectRestricted("fs-default"));
    it("rejects namespace node:fs import (bypasses named-import restrictions)", () => expectRestricted("fs-namespace"));

    it("rejects mutating node:fs/promises named imports", () => {
      for (const suffix of ["writeFile", "rm", "rename", "mkdir", "appendFile"]) {
        expectRestricted(`fsp-${suffix}`);
      }
    });

    it("rejects default node:fs/promises import (bypasses named-import restrictions)", () => expectRestricted("fsp-default"));
    it("rejects namespace node:fs/promises import (bypasses named-import restrictions)", () => expectRestricted("fsp-namespace"));
  });

  describe("allowed read-only imports", () => {
    it("allows constants from node:fs", () => expectAllowed("fs-constants"));
    it("allows existsSync from node:fs", () => expectAllowed("fs-existsSync"));
    it("allows readFileSync from node:fs", () => expectAllowed("fs-readFileSync"));
    it("allows access, readFile, stat from node:fs/promises", () => expectAllowed("fsp-access-readFile-stat"));
    it("allows readdir from node:fs/promises", () => expectAllowed("fsp-readdir"));
  });
});

// ===== Runtime immutability tests =====

describe("doctor runtime immutability", () => {
  it("quick doctor does not mutate .nx or .arolariu sentinel files", async () => {
    const root = resolve(process.cwd());
    const nxPath = resolve(root, ".nx");
    const arolaruPath = resolve(root, ".arolariu");

    const nxExistedBefore = existsSync(nxPath);
    const arolaruExistedBefore = existsSync(arolaruPath);
    const snapshotBefore = snapshotSentinelFiles(root);

    const entrypoint = fileURLToPath(new URL("./doctor.ts", import.meta.url));
    const {exitCode, signal, stdout, stderr} = await new Promise<{
      exitCode: number | null;
      signal: NodeJS.Signals | null;
      stdout: string;
      stderr: string;
    }>((resolvePromise, reject) => {
      const child = spawn(process.execPath, [entrypoint, "--quick"], {
        cwd: root,
        stdio: ["ignore", "pipe", "pipe"],
        env: {...process.env, FORCE_COLOR: "0"},
      });
      const outChunks: Buffer[] = [];
      const errChunks: Buffer[] = [];
      child.stdout!.on("data", (chunk: Buffer) => outChunks.push(chunk));
      child.stderr!.on("data", (chunk: Buffer) => errChunks.push(chunk));
      child.once("error", reject);
      child.once("close", (code, sig) =>
        resolvePromise({
          exitCode: code,
          signal: sig,
          stdout: Buffer.concat(outChunks).toString("utf8"),
          stderr: Buffer.concat(errChunks).toString("utf8"),
        }),
      );
    });

    // Finding 4: assert the CLI genuinely ran to completion.
    // Doctor exits 0 (healthy) or 1 (diagnostics found issues); anything else is a crash.
    expect(signal, "doctor must not be killed by a signal").toBeNull();
    expect(exitCode, `doctor exited with unexpected code ${exitCode}`).not.toBeNull();
    expect([0, 1], `doctor exit code ${exitCode} is neither 0 nor 1`).toContain(exitCode);

    // Assert recognizable doctor output so immutability check is not vacuous.
    const combinedOutput = stdout + stderr;
    expect(combinedOutput, "expected recognizable doctor output").toMatch(/doctor|diagnostic|health|score/i);

    // Finding 3: content-level immutability, not just existence.
    if (!nxExistedBefore) {
      expect(existsSync(nxPath), ".nx must not be created by quick doctor").toBe(false);
    }
    expect(existsSync(arolaruPath), ".arolariu must not be created by quick doctor").toBe(arolaruExistedBefore);

    const snapshotAfter = snapshotSentinelFiles(root);
    expect(snapshotAfter, "sentinel files must not be mutated by quick doctor").toEqual(snapshotBefore);
  }, 120_000);

  it("full-profile runDoctor with injected inspection session does not mutate .nx or .arolariu", async () => {
    const root = resolve(process.cwd());
    const nxPath = resolve(root, ".nx");
    const arolaruPath = resolve(root, ".arolariu");

    const nxExistedBefore = existsSync(nxPath);
    const arolaruExistedBefore = existsSync(arolaruPath);
    const snapshotBefore = snapshotSentinelFiles(root);

    const {modules} = createFakeModules();
    await runDoctor(
      {quick: false, verbose: false},
      {
        ...fixedDependencies(),
        modules,
      },
    );

    if (!nxExistedBefore) {
      expect(existsSync(nxPath), ".nx must not be created during full-profile immutability test").toBe(false);
    }
    expect(existsSync(arolaruPath), ".arolariu must not be created during full-profile immutability test").toBe(arolaruExistedBefore);

    const snapshotAfter = snapshotSentinelFiles(root);
    expect(snapshotAfter, "sentinel files must not be mutated during full-profile doctor").toEqual(snapshotBefore);
  });
});
