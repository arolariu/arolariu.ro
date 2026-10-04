// @vitest-environment node
/**
 * @fileoverview Read-only capability and runtime immutability tests for the doctor pipeline.
 * @module scripts/commands/doctor/readonly.test
 *
 * @remarks
 * The read-only profile is enforced at three levels: the type level ({@link DoctorRequirements}
 * excludes the mutating `FileSystem`, the unrestricted `HttpClient`, and `Prompts`), the import
 * level (the "read-only families never import mutating capabilities" rule of
 * `scripts/common/runtime-boundary.test.ts`, which covers doctor, status, and inspection), and at
 * runtime (bounded content snapshots of sentinel files detect mutation, not merely creation).
 */

import {createHash} from "node:crypto";
import {existsSync, readFileSync} from "node:fs";
import {spawn} from "node:child_process";
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";

import {Layer, type FileSystem} from "effect";
import type {HttpClient} from "effect/http";
import {describe, expect, expectTypeOf, it} from "vitest";

import type {InspectionOutcome} from "../../inspection/types.ts";
import type {Prompts} from "../../platform/Prompts.ts";
import {makeTestLayer, runScoped, scriptedOutcomes} from "../../platform/testing.ts";
import {runDoctor} from "./index.ts";
import {NetworkProbeLive} from "./NetworkProbe.ts";
import type {DoctorRequirements} from "./types.ts";

// ===== Type-level capability profile =====

describe("doctor read-only capability profile", () => {
  it("doctor requirements exclude mutating services", () => {
    expectTypeOf<FileSystem.FileSystem>().not.toExtend<DoctorRequirements>();
    expectTypeOf<HttpClient.HttpClient>().not.toExtend<DoctorRequirements>();
    expectTypeOf<Prompts>().not.toExtend<DoctorRequirements>();
    expectTypeOf<FileSystem.FileSystem | HttpClient.HttpClient | Prompts>().not.toExtend<DoctorRequirements>();
  });
});

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

const UNAVAILABLE: InspectionOutcome<never> = {kind: "unavailable", reason: "Fake session for immutability test", durationMs: 0};

// ===== Runtime immutability tests =====

describe("doctor runtime immutability", () => {
  it("quick doctor does not mutate .nx or .arolariu sentinel files", async () => {
    const root = resolve(process.cwd());
    const nxPath = resolve(root, ".nx");
    const arolaruPath = resolve(root, ".arolariu");

    const nxExistedBefore = existsSync(nxPath);
    const arolaruExistedBefore = existsSync(arolaruPath);
    const snapshotBefore = snapshotSentinelFiles(root);

    const entrypoint = fileURLToPath(new URL("../../cli.ts", import.meta.url));
    const {exitCode, signal, stdout, stderr} = await new Promise<{
      exitCode: number | null;
      signal: NodeJS.Signals | null;
      stdout: string;
      stderr: string;
    }>((resolvePromise, reject) => {
      const child = spawn(process.execPath, [entrypoint, "doctor", "--quick"], {
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

  it("full-profile doctor with the real filesystem does not mutate .nx or .arolariu", async () => {
    const root = resolve(process.cwd());
    const nxPath = resolve(root, ".nx");
    const arolaruPath = resolve(root, ".arolariu");

    const nxExistedBefore = existsSync(nxPath);
    const arolaruExistedBefore = existsSync(arolaruPath);
    const snapshotBefore = snapshotSentinelFiles(root);

    // This is the one doctor test that intentionally uses the real Node filesystem: its whole
    // purpose is to prove that a real full-profile run leaves repository sentinels untouched.
    // Inspection reports every fact unavailable, so no worker or probe ever runs; processes and
    // HTTP are scripted.
    const harness = makeTestLayer({
      fileSystem: "node",
      environment: {cwd: root},
      inspection: {
        workspace: UNAVAILABLE,
        aggregate: UNAVAILABLE,
        "npm.root": UNAVAILABLE,
        "npm.github-scripts": UNAVAILABLE,
        packages: UNAVAILABLE,
        dotnet: UNAVAILABLE,
        python: UNAVAILABLE,
        react: UNAVAILABLE,
        "svelte.cv": UNAVAILABLE,
        "svelte.status": UNAVAILABLE,
        infrastructure: UNAVAILABLE,
      },
      processes: [scriptedOutcomes(() => ({kind: "succeeded", exitCode: 0, stdout: "", stderr: "", durationMs: 0}))],
      http: [{match: () => true, respond: {status: 200, body: ""}}],
    });

    const report = await runScoped(runDoctor({quick: false, verbose: false}), NetworkProbeLive.pipe(Layer.provideMerge(harness.layer)));

    expect(report.checks.length).toBeGreaterThan(0);
    expect(harness.httpCalls().map((request) => request.method)).toEqual(["GET", "GET"]);

    if (!nxExistedBefore) {
      expect(existsSync(nxPath), ".nx must not be created during full-profile immutability test").toBe(false);
    }
    expect(existsSync(arolaruPath), ".arolariu must not be created during full-profile immutability test").toBe(arolaruExistedBefore);

    const snapshotAfter = snapshotSentinelFiles(root);
    expect(snapshotAfter, "sentinel files must not be mutated during full-profile doctor").toEqual(snapshotBefore);
  });
});
