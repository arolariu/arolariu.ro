// @vitest-environment node
/**
 * @fileoverview Cross-platform cancellation test for an Effect command holding an inherited process tree.
 * @module scripts/platform/cancellation.integration.test
 *
 * @remarks
 * Starts `__fixtures__/cancellable-cli.ts hold` as a real Node process, waits for `READY` and the
 * `PARENT=`/`GRANDCHILD=` PIDs, cancels it, and checks the exit code and which processes are gone
 * within three seconds. On POSIX the fixture leads its own process group, like a shell job: a
 * Ctrl+C is a SIGINT to that whole foreground group, so the inherited tree (which stays in the
 * group) exits on its own well inside the interrupt grace period (exit `130`); a SIGTERM sent to
 * the CLI alone is forwarded to its direct child (exit `143`). Windows cannot deliver a catchable
 * signal to another process, so the fixture interrupts its own main fiber
 * (`--self-interrupt-after`), which takes the immediate `taskkill /T /F` path, and exits `130`.
 */

import {spawn} from "node:child_process";
import {fileURLToPath} from "node:url";

import {afterEach, describe, expect, it} from "vitest";

/** The cancellable fixture CLI. */
const FIXTURE = fileURLToPath(new URL("__fixtures__/cancellable-cli.ts", import.meta.url));

/** Upper bound of one live cancellation run. */
const LIVE_TIMEOUT_MS = 30_000;

/** How long the fixture tree may take to disappear after cancellation. */
const TREE_DEADLINE_MS = 3_000;

/** Upper bound of a Ctrl+C shutdown the child performs itself, far below the 15 s interrupt grace period. */
const SELF_SHUTDOWN_DEADLINE_MS = 5_000;

/** PIDs the fixture reported once its process tree was running. */
interface TreePids {
  readonly parent: number;
  readonly grandchild: number;
}

/** A running fixture invocation. */
interface FixtureRun {
  /** The fixture CLI process. */
  readonly child: ReturnType<typeof spawn>;
  /** Resolves once `READY`, `PARENT=`, and `GRANDCHILD=` were all printed. */
  readonly ready: Promise<TreePids>;
  /** Resolves with the fixture's exit code (`null` when it died by an uncaught signal). */
  readonly exited: Promise<number | null>;
}

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function waitForExit(pids: readonly number[]): Promise<void> {
  const deadline = Date.now() + TREE_DEADLINE_MS;
  while (pids.some(isAlive) && Date.now() < deadline) {
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
  }
}

const spawnedPids: number[] = [];

function startFixture(args: readonly string[], options: {readonly processGroup?: boolean} = {}): FixtureRun {
  const child = spawn(process.execPath, [FIXTURE, "hold", ...args], {
    stdio: ["ignore", "pipe", "pipe"],
    detached: options.processGroup === true,
  });
  let output = "";
  const ready = new Promise<TreePids>((resolveReady, rejectReady) => {
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      output += chunk;
      const parent = /PARENT=(\d+)/u.exec(output);
      const grandchild = /GRANDCHILD=(\d+)/u.exec(output);
      if (/^READY$/mu.test(output) && parent !== null && grandchild !== null) {
        const pids = {parent: Number(parent[1]), grandchild: Number(grandchild[1])};
        spawnedPids.push(pids.parent, pids.grandchild);
        resolveReady(pids);
      }
    });
    child.once("close", () => rejectReady(new Error(`fixture exited before its tree was ready; stdout:\n${output}`)));
  });
  const exited = new Promise<number | null>((resolveExit) => {
    child.once("close", (code) => resolveExit(code));
  });
  if (child.pid !== undefined) {
    spawnedPids.push(child.pid);
  }
  return {child, ready, exited};
}

describe("cancellation of an Effect command holding an inherited process tree", () => {
  afterEach(() => {
    for (const pid of spawnedPids.splice(0)) {
      if (isAlive(pid)) {
        process.kill(pid);
      }
    }
  });

  it.runIf(process.platform !== "win32")(
    "Ctrl+C to the foreground process group lets the inherited tree shut itself down (130)",
    async () => {
      // Arrange
      const run = startFixture([], {processGroup: true});
      const pids = await run.ready;
      const groupId = run.child.pid ?? 0;

      // Act
      const startedAt = Date.now();
      process.kill(-groupId, "SIGINT");
      const exitCode = await run.exited;
      const elapsedMs = Date.now() - startedAt;
      await waitForExit([pids.parent, pids.grandchild]);

      // Assert
      expect(exitCode).toBe(130);
      expect(elapsedMs).toBeLessThan(SELF_SHUTDOWN_DEADLINE_MS);
      expect(isAlive(pids.parent)).toBe(false);
      expect(isAlive(pids.grandchild)).toBe(false);
    },
    LIVE_TIMEOUT_MS,
  );

  it.runIf(process.platform !== "win32")(
    "SIGTERM to the CLI alone is forwarded to the inherited child (143)",
    async () => {
      // Arrange
      const run = startFixture([]);
      const pids = await run.ready;

      // Act
      const startedAt = Date.now();
      run.child.kill("SIGTERM");
      const exitCode = await run.exited;
      const elapsedMs = Date.now() - startedAt;
      await waitForExit([pids.parent]);

      // Assert
      expect(exitCode).toBe(143);
      expect(elapsedMs).toBeLessThan(SELF_SHUTDOWN_DEADLINE_MS);
      expect(isAlive(pids.parent)).toBe(false);
    },
    LIVE_TIMEOUT_MS,
  );

  it.runIf(process.platform === "win32")(
    "interrupt kills the inherited process tree after a self-interrupt (130)",
    async () => {
      // Arrange
      const run = startFixture(["--self-interrupt-after", "500"]);
      const pids = await run.ready;

      // Act
      const exitCode = await run.exited;
      await waitForExit([pids.parent, pids.grandchild]);

      // Assert
      expect(exitCode).toBe(130);
      expect(isAlive(pids.parent)).toBe(false);
      expect(isAlive(pids.grandchild)).toBe(false);
    },
    LIVE_TIMEOUT_MS,
  );
});
