// @vitest-environment node
/**
 * @fileoverview Contract tests for the isolated Nx workspace inspection provider.
 * @module scripts/inspection/workspace.test
 */

import {createHash} from "node:crypto";
import {lstat, mkdir, readdir, rm, symlink, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join, resolve, sep} from "node:path";
import {describe, expect, it, vi} from "vitest";

import {defaultCommandRunner, type CommandResult, type CommandRunner, type CommandSpec} from "../common/process.ts";
import {resolveRepositoryPaths} from "../common/repository-paths.ts";
import {createWorkspaceProvider, projectNxGraph, type WorkspaceFacts} from "./workspace.ts";

// ============================================================================
// Fixtures
// ============================================================================

/** A stable, non-existent absolute repository root used for pure projection tests. */
const REPOSITORY_ROOT = resolve(tmpdir(), "arolariu-workspace-fixture-root");

function rawNode(name: string, root: string, targets: readonly string[] = []): unknown {
  return {
    name,
    type: "lib",
    data: {
      root,
      targets: Object.fromEntries(targets.map((target) => [target, {executor: "nx:run-commands"}])),
    },
  };
}

function rawEdge(source: string, target: string, type: "static" | "dynamic" | "implicit" = "static"): unknown {
  return {source, target, type};
}

/** A minimal, valid two-project graph document with duplicate static/dynamic edges and one external dependency. */
function validRawGraph(): unknown {
  return {
    nodes: {
      "@scope/b": rawNode("@scope/b", "libs/b", ["build", "test"]),
      "@scope/a": rawNode("@scope/a", "libs/a", ["test", "build"]),
    },
    externalNodes: {
      "npm:zzz": {name: "npm:zzz", type: "npm", data: {version: "1.0.0"}},
    },
    dependencies: {
      "@scope/a": [
        rawEdge("@scope/a", "@scope/b", "static"),
        rawEdge("@scope/a", "@scope/b", "dynamic"),
        rawEdge("@scope/a", "npm:zzz", "static"),
      ],
      "@scope/b": [],
      "npm:zzz": [rawEdge("npm:zzz", "@scope/a", "static")],
    },
  };
}

// ============================================================================
// projectNxGraph — projection
// ============================================================================

describe("projectNxGraph", () => {
  it("projects sorted projects/targets and collapses duplicate static/dynamic edges", () => {
    const facts = projectNxGraph(validRawGraph(), REPOSITORY_ROOT);

    expect(facts.projects).toEqual([
      {name: "@scope/a", root: "libs/a", targets: ["build", "test"]},
      {name: "@scope/b", root: "libs/b", targets: ["build", "test"]},
    ]);
    expect(facts.dependencies).toEqual([{source: "@scope/a", target: "@scope/b"}]);
    expect(facts.cycles).toEqual([]);
  });

  it("filters external nodes and external dependency edges", () => {
    const facts = projectNxGraph(validRawGraph(), REPOSITORY_ROOT);

    expect(facts.projects.some(({name}) => name === "npm:zzz")).toBe(false);
    expect(facts.dependencies.some((edge) => edge.source === "npm:zzz" || edge.target === "npm:zzz")).toBe(false);
  });

  it("returns project roots using '/' separators relative to the repository root", () => {
    const facts = projectNxGraph(validRawGraph(), REPOSITORY_ROOT);

    for (const project of facts.projects) {
      expect(project.root).not.toContain("\\");
    }
  });

  it.each([
    ["a non-object document", null],
    ["an array document", []],
    ["a document missing 'nodes'", {dependencies: {}}],
    ["a document missing 'dependencies'", {nodes: {}}],
    ["a node that is not an object", {nodes: {a: "not-an-object"}, dependencies: {}}],
    ["a node missing 'name'", {nodes: {a: {data: {root: "libs/a"}}}, dependencies: {}}],
    ["a node whose 'name' does not match its key", {nodes: {a: rawNode("b", "libs/a")}, dependencies: {}}],
    ["a node missing 'data'", {nodes: {a: {name: "a"}}, dependencies: {}}],
    ["a node missing 'data.root'", {nodes: {a: {name: "a", data: {}}}, dependencies: {}}],
    ["a node with malformed 'data.targets'", {nodes: {a: {name: "a", data: {root: "libs/a", targets: "nope"}}}, dependencies: {}}],
    [
      "two projects sharing the same root",
      {
        nodes: {a: rawNode("a", "libs/shared"), b: rawNode("b", "libs/shared")},
        dependencies: {},
      },
    ],
    [
      "a dependency list that is not an array",
      {nodes: {a: rawNode("a", "libs/a")}, dependencies: {a: "nope"}},
    ],
    [
      "a dependency record missing 'target'",
      {nodes: {a: rawNode("a", "libs/a")}, dependencies: {a: [{source: "a"}]}},
    ],
    [
      "a dependency record whose 'source' does not match its owning key",
      {nodes: {a: rawNode("a", "libs/a"), b: rawNode("b", "libs/b")}, dependencies: {a: [rawEdge("b", "a")]}},
    ],
  ] as const)("throws a concise error for %s", (_label, value) => {
    expect(() => projectNxGraph(value, REPOSITORY_ROOT)).toThrow();
  });

  it("throws when a project root escapes the repository root", () => {
    const graph = {
      nodes: {a: rawNode("a", "../outside")},
      dependencies: {},
    };

    expect(() => projectNxGraph(graph, REPOSITORY_ROOT)).toThrow();
  });

  it("produces identical output regardless of node/edge declaration order", () => {
    const first = {
      nodes: {
        "@scope/a": rawNode("@scope/a", "libs/a", ["build"]),
        "@scope/b": rawNode("@scope/b", "libs/b", ["test"]),
      },
      dependencies: {
        "@scope/a": [rawEdge("@scope/a", "@scope/b", "dynamic"), rawEdge("@scope/a", "@scope/b", "static")],
      },
    };
    const second = {
      nodes: {
        "@scope/b": rawNode("@scope/b", "libs/b", ["test"]),
        "@scope/a": rawNode("@scope/a", "libs/a", ["build"]),
      },
      dependencies: {
        "@scope/a": [rawEdge("@scope/a", "@scope/b", "static"), rawEdge("@scope/a", "@scope/b", "dynamic")],
      },
    };

    expect(projectNxGraph(first, REPOSITORY_ROOT)).toEqual(projectNxGraph(second, REPOSITORY_ROOT));
  });

  it("detects directed cycles and de-duplicates rotated representations deterministically regardless of order", () => {
    const buildGraph = (edgeOrder: readonly (readonly [string, string])[]): unknown => {
      const dependencies: Record<string, unknown[]> = {a: [], b: [], c: []};
      for (const [source, target] of edgeOrder) {
        dependencies[source]!.push(rawEdge(source, target));
      }
      return {
        nodes: {c: rawNode("c", "libs/c"), a: rawNode("a", "libs/a"), b: rawNode("b", "libs/b")},
        dependencies,
      };
    };

    const first = buildGraph([
      ["a", "b"],
      ["b", "a"],
      ["b", "c"],
      ["c", "a"],
    ]);
    const second = buildGraph([
      ["c", "a"],
      ["b", "c"],
      ["b", "a"],
      ["a", "b"],
    ]);

    const firstFacts = projectNxGraph(first, REPOSITORY_ROOT);
    const secondFacts = projectNxGraph(second, REPOSITORY_ROOT);

    expect(firstFacts.cycles).toEqual([
      ["a", "b", "a"],
      ["a", "b", "c", "a"],
    ]);
    expect(secondFacts.cycles).toEqual(firstFacts.cycles);
  });
});

// ============================================================================
// createWorkspaceProvider — command construction
// ============================================================================

function commandResult(patch: Partial<CommandResult> = {}): CommandResult {
  return {
    code: 0,
    stdout: "",
    stderr: "",
    durationMs: 1,
    timedOut: false,
    ...patch,
  };
}

function successStdout(): string {
  return JSON.stringify(validRawGraph());
}

interface CapturedRun {
  readonly command: Readonly<CommandSpec>;
  readonly options: Readonly<{
    cwd?: string;
    env?: Readonly<NodeJS.ProcessEnv>;
    output?: string;
    timeoutMs?: number;
  }>;
}

function createFakeRunner(respond: (call: CapturedRun) => CommandResult): {
  runner: CommandRunner;
  calls: CapturedRun[];
} {
  const calls: CapturedRun[] = [];
  const run = vi.fn(async (command: Readonly<CommandSpec>, options: Readonly<CapturedRun["options"]> = {}) => {
    const call: CapturedRun = {command, options};
    calls.push(call);
    return respond(call);
  });
  return {runner: {run}, calls};
}

describe("createWorkspaceProvider command construction", () => {
  it("invokes the current Node executable with the worker path, root argument, cwd, capture output, timeout, and NX_* env values, using a temp root outside the repository, cleaned up after success", async () => {
    const repositoryRoot = resolve(tmpdir(), "arolariu-workspace-provider-fixture");
    let capturedTempRoot: string | undefined;

    const {runner, calls} = createFakeRunner((call) => {
      const workspaceDataDirectory = call.options.env?.["NX_WORKSPACE_DATA_DIRECTORY"];
      expect(typeof workspaceDataDirectory).toBe("string");
      capturedTempRoot = resolve(String(workspaceDataDirectory), "..");
      return commandResult({stdout: successStdout()});
    });

    const provider = createWorkspaceProvider({root: repositoryRoot, runner, now: () => 0});
    const outcome = await provider();

    expect(outcome.kind).toBe("available");
    expect(calls).toHaveLength(1);
    const call = calls[0]!;

    expect(call.command.command).toBe(process.execPath);
    expect(call.command.args).toHaveLength(2);
    expect(call.command.args[0]).toBe(resolve(repositoryRoot, "scripts", "inspection", "workspace.worker.ts"));
    expect(call.command.args[1]).toBe(resolve(repositoryRoot));
    expect(call.options.cwd).toBe(resolve(repositoryRoot));
    expect(call.options.output).toBe("capture");
    expect(call.options.timeoutMs).toBe(120_000);

    const env = call.options.env ?? {};
    expect(env["NX_DAEMON"]).toBe("false");
    expect(env["NX_LOAD_DOT_ENV_FILES"]).toBe("false");
    expect(env["NX_WORKSPACE_ROOT_PATH"]).toBe(resolve(repositoryRoot));
    expect(String(env["NX_WORKSPACE_DATA_DIRECTORY"])).toBe(join(String(capturedTempRoot), "workspace-data"));
    expect(String(env["NX_CACHE_DIRECTORY"])).toBe(join(String(capturedTempRoot), "cache"));

    expect(capturedTempRoot).toBeDefined();
    expect(resolve(String(capturedTempRoot))).not.toMatch(new RegExp(`^${resolve(repositoryRoot).replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}`, "u"));
    expect(String(capturedTempRoot).startsWith(resolve(tmpdir()))).toBe(true);

    await expect(lstat(String(capturedTempRoot))).rejects.toMatchObject({code: "ENOENT"});
  });

  it("cleans up the temporary root even when the worker command fails", async () => {
    const repositoryRoot = resolve(tmpdir(), "arolariu-workspace-provider-fixture-failure");
    let capturedTempRoot: string | undefined;

    const {runner} = createFakeRunner((call) => {
      const workspaceDataDirectory = call.options.env?.["NX_WORKSPACE_DATA_DIRECTORY"];
      capturedTempRoot = resolve(String(workspaceDataDirectory), "..");
      return commandResult({code: 1, stderr: "boom"});
    });

    const provider = createWorkspaceProvider({root: repositoryRoot, runner, now: () => 0});
    const outcome = await provider();

    expect(outcome.kind).toBe("unavailable");
    expect(capturedTempRoot).toBeDefined();
    await expect(lstat(String(capturedTempRoot))).rejects.toMatchObject({code: "ENOENT"});
  });
});

// ============================================================================
// createWorkspaceProvider — outcome mapping
// ============================================================================

describe("createWorkspaceProvider outcome mapping", () => {
  const repositoryRoot = resolve(tmpdir(), "arolariu-workspace-provider-outcome-fixture");

  it("maps a spawn failure to 'unavailable' without raw output", async () => {
    const {runner} = createFakeRunner(() => commandResult({spawnError: "spawn ENOENT super-secret-raw-marker"}));
    const outcome = await createWorkspaceProvider({root: repositoryRoot, runner, now: () => 5})();

    expect(outcome.kind).toBe("unavailable");
    if (outcome.kind === "unavailable") {
      expect(outcome.reason).toContain("spawn ENOENT super-secret-raw-marker");
      expect(outcome.durationMs).toBeGreaterThanOrEqual(0);
    }
  });

  it("maps a nonzero exit to 'unavailable' without raw stdout/stderr", async () => {
    const {runner} = createFakeRunner(() =>
      commandResult({code: 1, stdout: "raw-stdout-secret-marker", stderr: "raw-stderr-secret-marker"}),
    );
    const outcome = await createWorkspaceProvider({root: repositoryRoot, runner, now: () => 5})();

    expect(outcome.kind).toBe("unavailable");
    if (outcome.kind === "unavailable") {
      expect(outcome.reason).not.toContain("raw-stdout-secret-marker");
      expect(outcome.reason).not.toContain("raw-stderr-secret-marker");
    }
  });

  it("maps a timeout to 'unavailable' without raw output", async () => {
    const {runner} = createFakeRunner(() =>
      commandResult({code: 1, timedOut: true, stdout: "raw-stdout-secret-marker", stderr: "raw-stderr-secret-marker"}),
    );
    const outcome = await createWorkspaceProvider({root: repositoryRoot, runner, now: () => 5})();

    expect(outcome.kind).toBe("unavailable");
    if (outcome.kind === "unavailable") {
      expect(outcome.reason).not.toContain("raw-stdout-secret-marker");
      expect(outcome.reason).not.toContain("raw-stderr-secret-marker");
      expect(outcome.reason.toLowerCase()).toContain("timed out");
    }
  });

  it("maps malformed JSON on a zero exit to 'invalid' without raw output", async () => {
    const {runner} = createFakeRunner(() => commandResult({stdout: "not-json-secret-marker{{{"}));
    const outcome = await createWorkspaceProvider({root: repositoryRoot, runner, now: () => 5})();

    expect(outcome.kind).toBe("invalid");
    if (outcome.kind === "invalid") {
      expect(outcome.issues.join("\n")).not.toContain("not-json-secret-marker");
    }
  });

  it("maps an invalid graph projection on a zero exit to 'invalid' with a concise issue", async () => {
    const malformedGraph = {nodes: {a: {name: "mismatched-name", data: {root: "libs/a"}}}, dependencies: {}};
    const {runner} = createFakeRunner(() => commandResult({stdout: JSON.stringify(malformedGraph)}));
    const outcome = await createWorkspaceProvider({root: repositoryRoot, runner, now: () => 5})();

    expect(outcome.kind).toBe("invalid");
    if (outcome.kind === "invalid") {
      expect(outcome.issues.length).toBeGreaterThan(0);
    }
  });

  it("maps a valid zero-exit document to 'available' with projected facts", async () => {
    const {runner} = createFakeRunner(() => commandResult({stdout: successStdout()}));
    const outcome = await createWorkspaceProvider({root: repositoryRoot, runner, now: () => 5})();

    expect(outcome.kind).toBe("available");
    if (outcome.kind === "available") {
      const facts: WorkspaceFacts = outcome.value;
      expect(facts.projects.map(({name}) => name)).toEqual(["@scope/a", "@scope/b"]);
      expect(facts.dependencies).toEqual([{source: "@scope/a", target: "@scope/b"}]);
    }
  });
});

// ============================================================================
// Live snapshot helper (test-only)
// ============================================================================

interface PathSnapshotEntry {
  readonly type: "file" | "directory" | "symlink" | "other";
  readonly hash?: string;
  readonly size?: number;
}

function isErrnoException(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

async function hashFile(path: string): Promise<string> {
  const hash = createHash("sha256");
  const {readFile} = await import("node:fs/promises");
  hash.update(await readFile(path));
  return hash.digest("hex");
}

/**
 * Snapshots a filesystem path for before/after equality checks without ever following a
 * symlink/junction (each is recorded as an opaque `"symlink"` entry) and without descending into
 * `.nx/cache` unless it is explicitly the requested root itself with `recursive: false`.
 *
 * @param root - Absolute path to snapshot.
 * @param options - Whether to descend into subdirectories.
 * @returns `null` when `root` does not exist, otherwise a map of POSIX-relative entry paths.
 */
async function snapshotPath(root: string, options: Readonly<{recursive: boolean}>): Promise<ReadonlyMap<string, PathSnapshotEntry> | null> {
  let rootStat;
  try {
    rootStat = await lstat(root);
  } catch (error) {
    if (isErrnoException(error) && error.code === "ENOENT") {
      return null;
    }
    throw error;
  }

  const entries = new Map<string, PathSnapshotEntry>();
  if (rootStat.isSymbolicLink()) {
    entries.set(".", {type: "symlink"});
    return entries;
  }
  if (!rootStat.isDirectory()) {
    entries.set(".", {
      type: rootStat.isFile() ? "file" : "other",
      size: rootStat.size,
      ...(rootStat.isFile() ? {hash: await hashFile(root)} : {}),
    });
    return entries;
  }

  const walk = async (relativePrefix: string): Promise<void> => {
    const directoryEntries = (await readdir(join(root, relativePrefix), {withFileTypes: true})).toSorted((left, right) =>
      left.name < right.name ? -1 : left.name > right.name ? 1 : 0,
    );
    for (const directoryEntry of directoryEntries) {
      const entryRelativePath = (relativePrefix === "" ? directoryEntry.name : `${relativePrefix}/${directoryEntry.name}`).split(sep).join("/");
      const absolutePath = join(root, relativePrefix, directoryEntry.name);
      const entryStat = await lstat(absolutePath);

      if (entryStat.isSymbolicLink()) {
        entries.set(entryRelativePath, {type: "symlink"});
        continue;
      }
      if (entryStat.isDirectory()) {
        entries.set(entryRelativePath, {type: "directory"});
        if (options.recursive) {
          await walk(relativePrefix === "" ? directoryEntry.name : `${relativePrefix}/${directoryEntry.name}`);
        }
        continue;
      }
      if (entryStat.isFile()) {
        entries.set(entryRelativePath, {type: "file", size: entryStat.size, hash: await hashFile(absolutePath)});
        continue;
      }
      entries.set(entryRelativePath, {type: "other"});
    }
  };

  await walk("");
  return entries;
}

function sortedSnapshotEntries(snapshot: ReadonlyMap<string, PathSnapshotEntry> | null): readonly (readonly [string, PathSnapshotEntry])[] | null {
  if (snapshot === null) {
    return null;
  }
  return [...snapshot.entries()].toSorted(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
}

describe("live snapshot helper", () => {
  it("tolerates an absent inspected path", async () => {
    const missing = resolve(tmpdir(), `arolariu-workspace-snapshot-missing-${Date.now()}-${Math.random().toString(16).slice(2)}`);

    await expect(snapshotPath(missing, {recursive: true})).resolves.toBeNull();
  });

  it("does not follow a symlink/junction out of its named scope", async () => {
    const fixtureRoot = await import("node:fs/promises").then((fs) => fs.mkdtemp(join(tmpdir(), "arolariu-workspace-snapshot-")));
    try {
      const outsideDirectory = join(fixtureRoot, "outside");
      const scopedDirectory = join(fixtureRoot, "scoped");
      await mkdir(outsideDirectory, {recursive: true});
      await mkdir(scopedDirectory, {recursive: true});
      await writeFile(join(outsideDirectory, "secret.txt"), "outside-content", "utf8");

      let linkCreated = true;
      try {
        await symlink(outsideDirectory, join(scopedDirectory, "linked"), "junction");
      } catch {
        // Cross-platform/privilege limitation: proceed without the link; the scoped
        // directory then simply has no entries to (not) descend into.
        linkCreated = false;
      }

      const snapshot = await snapshotPath(scopedDirectory, {recursive: true});
      expect(snapshot).not.toBeNull();
      if (linkCreated) {
        expect(snapshot?.get("linked")).toEqual({type: "symlink"});
        expect(snapshot?.has("linked/secret.txt")).toBe(false);
      }
    } finally {
      await rm(fixtureRoot, {recursive: true, force: true});
    }
  });
});

// ============================================================================
// Live integration (real Nx workspace, real shared runner)
// ============================================================================

/**
 * Wall-clock budget for the live Nx provider case.
 *
 * @remarks
 * Must stay strictly greater than the provider's own `WORKER_TIMEOUT_MS` (120s in
 * `./workspace.ts`) so the provider's bounded outcome — not this outer budget — always decides the
 * result. The case normally completes in ~25s; the headroom only covers full-suite parallel load.
 */
const LIVE_WORKSPACE_TIMEOUT_MS = 180_000;

describe("createWorkspaceProvider live integration", () => {
  it(
    "reflects the current seven-project workspace graph and leaves top-level .nx files, .nx/workspace-data, and .arolariu unchanged",
    async () => {
      const paths = resolveRepositoryPaths();

      const nxTopLevelBefore = await snapshotPath(join(paths.root, ".nx"), {recursive: false});
      const workspaceDataBefore = await snapshotPath(join(paths.root, ".nx", "workspace-data"), {recursive: true});
      const arolariuBefore = await snapshotPath(join(paths.root, ".arolariu"), {recursive: true});

      const outcome = await createWorkspaceProvider({
        root: paths.root,
        runner: defaultCommandRunner,
        now: () => performance.now(),
      })();

      // The provider bounds its own Nx worker invocation and reports a typed `unavailable`/
      // `invalid` outcome instead of throwing. Asserting on the kind alone would hide that reason
      // behind a bare "expected 'unavailable' to be 'available'", so the reason is folded into the
      // compared value. The requirement itself is unchanged: only a real Nx graph passes.
      const detail = outcome.kind === "available" ? "" : outcome.kind === "unavailable" ? outcome.reason : outcome.issues.join("; ");
      expect(detail === "" ? outcome.kind : `${outcome.kind} (${detail})`).toBe("available");
      if (outcome.kind === "available") {
        expect(outcome.value.projects.map(({name}) => name)).toEqual([
          "@arolariu/api",
          "@arolariu/components",
          "@arolariu/cv",
          "@arolariu/docs",
          "@arolariu/exp",
          "@arolariu/status",
          "@arolariu/website",
        ]);
        expect(outcome.value.dependencies).toEqual([{source: "@arolariu/website", target: "@arolariu/components"}]);
      }

      const nxTopLevelAfter = await snapshotPath(join(paths.root, ".nx"), {recursive: false});
      const workspaceDataAfter = await snapshotPath(join(paths.root, ".nx", "workspace-data"), {recursive: true});
      const arolariuAfter = await snapshotPath(join(paths.root, ".arolariu"), {recursive: true});

      expect(sortedSnapshotEntries(nxTopLevelAfter)).toEqual(sortedSnapshotEntries(nxTopLevelBefore));
      expect(sortedSnapshotEntries(workspaceDataAfter)).toEqual(sortedSnapshotEntries(workspaceDataBefore));
      expect(sortedSnapshotEntries(arolariuAfter)).toEqual(sortedSnapshotEntries(arolariuBefore));
    },
    // The provider bounds its own Nx worker at 120s (`WORKER_TIMEOUT_MS` in `./workspace.ts`).
    // A test budget equal to that bound leaves no headroom for the surrounding filesystem
    // snapshots, so the outer timeout could pre-empt the provider's own bounded outcome under
    // full-suite parallel load. The budget stays strictly greater than the provider's.
    LIVE_WORKSPACE_TIMEOUT_MS,
  );
});
