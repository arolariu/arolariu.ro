// @vitest-environment node
/**
 * @fileoverview Runtime immutability tests for the doctor pipeline.
 *
 * These tests use bounded content snapshots of sentinel files so that mutation
 * (not merely creation) is detected.
 *
 * @module scripts/doctor.readonly.test
 */

import {createHash} from "node:crypto";
import {existsSync, readFileSync} from "node:fs";
import {spawn} from "node:child_process";
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {describe, expect, it} from "vitest";
import {nodeFileSystem} from "./common/runtime.node.ts";
import {createTestRuntimeFactory} from "./common/runtime.testing.ts";
import {createDoctorCommand} from "./doctor.ts";
import type {RepositoryInspectionSession} from "./inspection/repository.ts";
import type {InspectionOutcome} from "./inspection/types.ts";

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

/** Fake session that reports every fact as unavailable, so no worker or probe ever runs. */
function createFakeInspectionSession(): RepositoryInspectionSession {
  return {
    inspect: async (): Promise<InspectionOutcome<unknown>> => ({
      kind: "unavailable" as const,
      reason: "Fake session for immutability test",
      durationMs: 0,
    }),
    invalidate: (): void => {},
    updateInfrastructureEngine: (): void => {},
  } as unknown as RepositoryInspectionSession;
}

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

  it("full-profile doctor command with the real filesystem does not mutate .nx or .arolariu", async () => {
    const root = resolve(process.cwd());
    const nxPath = resolve(root, ".nx");
    const arolaruPath = resolve(root, ".arolariu");

    const nxExistedBefore = existsSync(nxPath);
    const arolaruExistedBefore = existsSync(arolaruPath);
    const snapshotBefore = snapshotSentinelFiles(root);

    // This is the one doctor test that intentionally uses the real Node filesystem: its whole
    // purpose is to prove that a real full-profile run leaves repository sentinels untouched.
    // Every ordinary doctor command test uses the in-memory repository fixture instead.
    const existingSession = createFakeInspectionSession();
    const command = createDoctorCommand({
      runtimeFactory: createTestRuntimeFactory({
        files: nodeFileSystem,
        inspection: {getRepositorySession: (): RepositoryInspectionSession => existingSession},
      }),
    });

    const execution = await command.invoke({quick: false, verbose: false}, {presentation: "silent"});

    const failureDetail =
      execution.status === "failed" || execution.status === "cancelled"
        ? [execution.failure.message, ...execution.failure.evidence].join(" | ")
        : "";
    expect(execution.status, `full-profile doctor must complete: ${failureDetail}`).toBe("completed");

    if (!nxExistedBefore) {
      expect(existsSync(nxPath), ".nx must not be created during full-profile immutability test").toBe(false);
    }
    expect(existsSync(arolaruPath), ".arolariu must not be created during full-profile immutability test").toBe(arolaruExistedBefore);

    const snapshotAfter = snapshotSentinelFiles(root);
    expect(snapshotAfter, "sentinel files must not be mutated during full-profile doctor").toEqual(snapshotBefore);
  });
});
