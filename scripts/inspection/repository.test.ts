// @vitest-environment node
/**
 * @fileoverview Contract tests for the composed repository inspection session.
 * @module scripts/inspection/repository.test
 *
 * @remarks
 * These tests exercise wiring, not domain correctness: every individual provider already has its
 * own focused test suite. Sharing through the session cache is observed at the true external
 * boundaries: the aggregate provider's runs are its `aggregate-worker.ts` process calls, and the
 * installed-package provider's runs are its reads of the requested `node_modules` manifests,
 * recorded by a `ReadOnlyFiles` wrapper over the harness. Every session runs over the in-memory
 * harness: a filesystem holding one installed manifest and a scripted `Process`.
 */

import {Deferred, Duration, Effect, Exit, Fiber, Layer, Scope} from "effect";
import {describe, expect, it} from "vitest";

import {createRepositoryPaths} from "../common/repository-paths.ts";
import {ReadOnlyFiles} from "../platform/Files.ts";
import {ProcessExited, ProcessTimedOut, type ProcessError, type ProcessResult} from "../platform/Process.ts";
import {effectTest, makeTestLayer, repositoryFixtureRoot, type ScriptedProcess, type TestHarness} from "../platform/testing.ts";
import {INSPECTED_PACKAGE_NAMES} from "./packages.ts";
import {
  createRepositoryInspectionSession,
  equivalentRepositoryInspectionRequests,
  repositoryInspectionConflictMessage,
  repositoryInspectionRequestKey,
  type RepositoryInspectionKey,
  type RepositoryInspectionRequest,
} from "./repository.ts";

// ============================================================================
// Fixtures
// ============================================================================

/** Canonical repository paths; every provider reads them through the empty in-memory filesystem. */
const repositoryPaths = createRepositoryPaths(repositoryFixtureRoot);

/** Default scripted outcome: every command is a bounded, completed failure. */
const completedFailure: ScriptedProcess["respond"] = new ProcessExited({
  command: "scripted",
  stdout: "",
  stderr: "",
  durationMs: 1,
  message: "scripted exit",
  exitCode: 1,
});

/** A harness plus the file reads its sessions performed. */
interface RecordingHarness extends TestHarness {
  /** Every `ReadOnlyFiles.readFileString` path, in order. */
  readonly reads: () => readonly string[];
}

/**
 * Builds a harness whose `Process` answers every request with `respond` and whose `ReadOnlyFiles`
 * records every text read.
 *
 * @param overrides - Platform and scripted response.
 * @returns The harness.
 */
function harnessFor(
  overrides: Readonly<
    Partial<{
      platform: NodeJS.Platform;
      respond: ScriptedProcess["respond"];
    }>
  > = {},
): RecordingHarness {
  const harness = makeTestLayer({
    environment: {platform: overrides.platform ?? "linux", cwd: repositoryPaths.root, isCI: true},
    files: {"node_modules/react/package.json": JSON.stringify({name: "react", version: "19.2.8"})},
    processes: [{match: () => true, respond: overrides.respond ?? completedFailure}],
  });
  const reads: string[] = [];
  const recording = Layer.effect(
    ReadOnlyFiles,
    Effect.map(ReadOnlyFiles, (files) =>
      ReadOnlyFiles.of({
        ...files,
        readFileString: (path, encoding) => {
          reads.push(path);
          return files.readFileString(path, encoding);
        },
      }),
    ),
  );
  return {...harness, layer: recording.pipe(Layer.provideMerge(harness.layer)), reads: () => [...reads]};
}

/**
 * Counts the installed-package provider runs a harness observed: each run reads the requested
 * `react` manifest exactly once.
 *
 * @param harness - The harness.
 * @returns The number of package-inventory runs.
 */
function packageInventoryRuns(harness: RecordingHarness): number {
  return harness.reads().filter((path) => normalizedPath(path).endsWith("/node_modules/react/package.json")).length;
}

/**
 * Normalizes a path to `/` separators.
 *
 * @param path - The path.
 * @returns The path with every `\\` replaced by `/`.
 */
function normalizedPath(path: string): string {
  return path.replaceAll("\\", "/");
}

/**
 * Counts the aggregate worker processes a harness started.
 *
 * @param harness - The harness.
 * @returns The number of aggregate worker runs.
 */
function aggregateWorkerRuns(harness: TestHarness): number {
  return harness.processCalls().filter((call) => isAggregateWorker(call.request.args)).length;
}

/**
 * Builds a request over the fixture paths.
 *
 * @param profile - Inspection profile.
 * @returns The request.
 */
function requestFor(profile: "full" | "quick" = "full"): RepositoryInspectionRequest {
  return {profile, paths: repositoryPaths};
}

/**
 * Checks whether a recorded process call starts the aggregate worker.
 *
 * @param args - The recorded arguments.
 * @returns Whether any argument names the aggregate worker.
 */
function isAggregateWorker(args: readonly string[]): boolean {
  return args.some((arg) => arg.includes("aggregate-worker"));
}

// ============================================================================
// Tests
// ============================================================================

describe("createRepositoryInspectionSession aggregate wiring", () => {
  const sharedHarness = harnessFor();
  effectTest(
    "shares one aggregate worker run between concurrent inspections",
    () =>
      Effect.gen(function* () {
        // Arrange
        const session = yield* createRepositoryInspectionSession(requestFor("full"));

        // Act
        yield* Effect.all([session.inspect("aggregate"), session.inspect("aggregate")], {concurrency: 2});

        // Assert
        expect(aggregateWorkerRuns(sharedHarness)).toBe(1);
      }),
    sharedHarness.layer,
  );

  const quickHarness = harnessFor();
  effectTest(
    "never runs the aggregate worker under the quick profile",
    () =>
      Effect.gen(function* () {
        // Arrange
        const session = yield* createRepositoryInspectionSession(requestFor("quick"));

        // Act
        const outcome = yield* session.inspect("aggregate");
        yield* session.inspect("aggregate");
        yield* session.inspect("infrastructure");

        // Assert
        expect(outcome.kind).toBe("unavailable");
        if (outcome.kind === "unavailable") {
          expect(outcome.reason).toMatch(/quick/iu);
        }
        expect(aggregateWorkerRuns(quickHarness)).toBe(0);
      }),
    quickHarness.layer,
  );

  const cachedHarness = harnessFor();
  effectTest(
    "reuses the already-cached aggregate outcome when infrastructure is inspected afterward",
    () =>
      Effect.gen(function* () {
        // Arrange
        const session = yield* createRepositoryInspectionSession(requestFor("full"));
        yield* session.inspect("aggregate");
        expect(aggregateWorkerRuns(cachedHarness)).toBe(1);

        // Act
        yield* session.inspect("infrastructure");

        // Assert
        expect(aggregateWorkerRuns(cachedHarness)).toBe(1);
      }),
    cachedHarness.layer,
  );
});

describe("createRepositoryInspectionSession packages wiring", () => {
  const inventoryHarness = harnessFor();
  effectTest(
    "reads exactly the INSPECTED_PACKAGE_NAMES manifests once",
    () =>
      Effect.gen(function* () {
        // Arrange
        const session = yield* createRepositoryInspectionSession(requestFor("full"));

        // Act
        const outcome = yield* session.inspect("packages");

        // Assert
        const manifests = inventoryHarness
          .reads()
          .map(normalizedPath)
          .filter((path) => path.includes("/node_modules/"));
        expect(manifests.toSorted()).toEqual(
          INSPECTED_PACKAGE_NAMES.map((name) => {
            const root = name === "@arolariu/components" ? repositoryPaths.websiteRoot : repositoryPaths.root;
            return `${normalizedPath(root)}/node_modules/${name}/package.json`;
          }).toSorted(),
        );
        expect(outcome).toMatchObject({kind: "available", value: {installed: {react: {version: "19.2.8"}}}});
      }),
    inventoryHarness.layer,
  );

  const sharedInventoryHarness = harnessFor();
  effectTest(
    "shares one memoized packages outcome across concurrent React and Svelte inspections",
    () =>
      Effect.gen(function* () {
        // Arrange
        const session = yield* createRepositoryInspectionSession(requestFor("full"));

        // Act
        yield* Effect.all([session.inspect("react"), session.inspect("svelte.cv"), session.inspect("svelte.status")], {
          concurrency: "unbounded",
        });

        // Assert
        expect(packageInventoryRuns(sharedInventoryHarness)).toBe(1);
      }),
    sharedInventoryHarness.layer,
  );
});

describe("createRepositoryInspectionSession targeted invalidation", () => {
  effectTest(
    "does not rerun dotnet when only python is invalidated",
    () =>
      Effect.gen(function* () {
        // Arrange: an unsupported platform makes both providers resolve without running a process.
        const session = yield* createRepositoryInspectionSession(requestFor("full"));
        const firstDotnet = yield* session.inspect("dotnet");
        yield* session.inspect("python");

        // Act
        yield* session.invalidate("python");
        const secondDotnet = yield* session.inspect("dotnet");

        // Assert
        expect(secondDotnet).toBe(firstDotnet);
      }),
    harnessFor({platform: "aix" as NodeJS.Platform}).layer,
  );

  const reactHarness = harnessFor();
  effectTest(
    "only refreshes React's package facts after both packages and its own key are invalidated",
    () =>
      Effect.gen(function* () {
        // Arrange
        const session = yield* createRepositoryInspectionSession(requestFor("full"));
        yield* session.inspect("react");
        expect(packageInventoryRuns(reactHarness)).toBe(1);

        // Act + Assert: invalidating "packages" alone does not retroactively refresh an already-cached "react".
        yield* session.invalidate("packages");
        yield* session.inspect("react");
        expect(packageInventoryRuns(reactHarness)).toBe(1);

        // Only invalidating both the dependency and the consumer's own key forces a fresh read.
        yield* session.invalidate("packages", "react");
        yield* session.inspect("react");
        expect(packageInventoryRuns(reactHarness)).toBe(2);
      }),
    reactHarness.layer,
  );

  const svelteHarness = harnessFor();
  effectTest(
    "only refreshes Svelte's package facts after both packages and its own key are invalidated",
    () =>
      Effect.gen(function* () {
        // Arrange
        const session = yield* createRepositoryInspectionSession(requestFor("full"));
        yield* session.inspect("svelte.cv");
        expect(packageInventoryRuns(svelteHarness)).toBe(1);

        // Act + Assert
        yield* session.invalidate("packages");
        yield* session.inspect("svelte.cv");
        expect(packageInventoryRuns(svelteHarness)).toBe(1);

        yield* session.invalidate("packages", "svelte.cv");
        yield* session.inspect("svelte.cv");
        expect(packageInventoryRuns(svelteHarness)).toBe(2);
      }),
    svelteHarness.layer,
  );
});

// ============================================================================
// updateInfrastructureEngine + invalidation + reinspection
// ============================================================================

describe("createRepositoryInspectionSession updateInfrastructureEngine", () => {
  effectTest(
    "updateInfrastructureEngine followed by invalidate and reinspect causes the composed infrastructure provider to observe the updated engine",
    () =>
      Effect.gen(function* () {
        // Arrange: no initial engine, so the first infrastructure inspection skips engine probes.
        const session = yield* createRepositoryInspectionSession(requestFor("full"));
        const first = yield* session.inspect("infrastructure");
        expect(first.kind).toBe("available");
        expect(first.kind === "available" ? first.value.selectedEngine : "unexpected").toBeUndefined();

        // Act
        yield* session.updateInfrastructureEngine("podman");
        yield* session.invalidate("infrastructure");
        const second = yield* session.inspect("infrastructure");

        // Assert
        expect(second.kind).toBe("available");
        expect(second.kind === "available" ? second.value.selectedEngine : undefined).toBe("podman");
      }),
    harnessFor({platform: "aix" as NodeJS.Platform}).layer,
  );

  effectTest(
    "starts from the requested engine",
    () =>
      Effect.gen(function* () {
        // Arrange
        const session = yield* createRepositoryInspectionSession({...requestFor("full"), requestedEngine: "rancher"});

        // Act
        const outcome = yield* session.inspect("infrastructure");

        // Assert
        expect(outcome.kind === "available" ? outcome.value.selectedEngine : undefined).toBe("rancher");
      }),
    harnessFor({platform: "aix" as NodeJS.Platform}).layer,
  );

  effectTest(
    "updateInfrastructureEngine without invalidation does not change the cached outcome",
    () =>
      Effect.gen(function* () {
        // Arrange
        const session = yield* createRepositoryInspectionSession(requestFor("full"));
        const first = yield* session.inspect("infrastructure");

        // Act
        yield* session.updateInfrastructureEngine("rancher");
        const second = yield* session.inspect("infrastructure");

        // Assert
        expect(second).toBe(first);
      }),
    harnessFor({platform: "aix" as NodeJS.Platform}).layer,
  );

  effectTest(
    "exact infrastructure invalidation does not disturb other cached keys",
    () =>
      Effect.gen(function* () {
        // Arrange
        const session = yield* createRepositoryInspectionSession(requestFor("full"));
        const workspace = yield* session.inspect("workspace");
        yield* session.inspect("infrastructure");

        // Act
        yield* session.updateInfrastructureEngine("podman");
        yield* session.invalidate("infrastructure");
        const workspaceAfter = yield* session.inspect("workspace");

        // Assert
        expect(workspaceAfter).toBe(workspace);
      }),
    harnessFor({platform: "aix" as NodeJS.Platform}).layer,
  );
});

// ============================================================================
// Processes and interruption
// ============================================================================

describe("createRepositoryInspectionSession processes", () => {
  const boundedHarness = harnessFor();
  effectTest(
    "passes each probe's own bounded timeout to every process it runs",
    () =>
      Effect.gen(function* () {
        // Arrange
        const session = yield* createRepositoryInspectionSession(requestFor("full"));

        // Act
        yield* session.inspect("npm.root");
        yield* session.inspect("aggregate");

        // Assert
        const calls = boundedHarness.processCalls();
        expect(calls.length).toBeGreaterThanOrEqual(2);
        expect(calls.some((call) => isAggregateWorker(call.request.args))).toBe(true);
        for (const call of calls) {
          expect(call.options.timeout === undefined ? 0 : Duration.toMillis(call.options.timeout)).toBeGreaterThan(0);
        }
      }),
    boundedHarness.layer,
  );

  effectTest(
    "keeps the timed-out transport classification",
    () =>
      Effect.gen(function* () {
        // Arrange
        const session = yield* createRepositoryInspectionSession(requestFor("full"));

        // Act
        const outcome = yield* session.inspect("npm.root");

        // Assert
        expect(outcome.kind).toBe("unavailable");
        if (outcome.kind === "unavailable") {
          expect(outcome.reason).toMatch(/timed out/iu);
        }
      }),
    harnessFor({
      respond: new ProcessTimedOut({command: "npm ls", stdout: "", stderr: "", durationMs: 1, message: "timed out", timeoutMs: 1}),
    }).layer,
  );

  const started = Deferred.makeUnsafe<void>();
  let processInterrupted = false;
  const hanging = (): Effect.Effect<ProcessResult, ProcessError> =>
    Deferred.succeed(started, undefined).pipe(
      Effect.andThen(Effect.never),
      Effect.onInterrupt(() =>
        Effect.sync(() => {
          processInterrupted = true;
        }),
      ),
    );
  effectTest(
    "interrupts in-flight provider processes when the session scope closes",
    () =>
      Effect.gen(function* () {
        // Arrange
        const scope = yield* Scope.make();
        const session = yield* createRepositoryInspectionSession(requestFor("full")).pipe(Scope.provide(scope));
        const waiter = yield* Effect.forkChild(session.inspect("npm.root"));
        yield* Deferred.await(started);

        // Act
        yield* Scope.close(scope, Exit.void);
        const exit = yield* Fiber.await(waiter);

        // Assert
        expect(processInterrupted).toBe(true);
        expect(Exit.isFailure(exit)).toBe(true);
      }),
    harnessFor({respond: hanging}).layer,
  );
});

// ============================================================================
// Request keys
// ============================================================================

/**
 * Every {@link RepositoryInspectionKey}, kept exhaustive by the compiler: a new fact key that is
 * not listed here fails the `satisfies` check.
 */
const inspectionKeys: readonly RepositoryInspectionKey[] = Object.values({
  workspace: "workspace",
  aggregate: "aggregate",
  "npm.root": "npm.root",
  "npm.github-scripts": "npm.github-scripts",
  packages: "packages",
  dotnet: "dotnet",
  python: "python",
  react: "react",
  "svelte.cv": "svelte.cv",
  "svelte.status": "svelte.status",
  infrastructure: "infrastructure",
} satisfies Record<RepositoryInspectionKey, RepositoryInspectionKey>);

describe("repositoryInspectionRequestKey", () => {
  it("derives an identical key for structurally equal requests regardless of object identity", () => {
    const requestA: RepositoryInspectionRequest = {profile: "full", paths: createRepositoryPaths("C:/repo"), requestedEngine: "podman"};
    const requestB: RepositoryInspectionRequest = {profile: "full", paths: createRepositoryPaths("C:/repo"), requestedEngine: "podman"};

    expect(repositoryInspectionRequestKey(requestA)).toBe(repositoryInspectionRequestKey(requestB));
    expect(equivalentRepositoryInspectionRequests(requestA, requestB)).toBe(true);
  });

  it("keys by root, profile, and requested engine, and detects a conflicting paths object", () => {
    const paths = createRepositoryPaths("C:/repo");
    const base: RepositoryInspectionRequest = {profile: "quick", paths, requestedEngine: "rancher"};
    const conflicting: RepositoryInspectionRequest = {...base, paths: {...paths, websiteEnvironment: "C:/other/.env"}};

    expect(repositoryInspectionRequestKey({...base, requestedEngine: "podman"})).not.toBe(repositoryInspectionRequestKey(base));
    expect(repositoryInspectionRequestKey({...base, profile: "full"})).not.toBe(repositoryInspectionRequestKey(base));
    expect(repositoryInspectionRequestKey(conflicting)).toBe(repositoryInspectionRequestKey(base));
    expect(equivalentRepositoryInspectionRequests(conflicting, base)).toBe(false);
    expect(repositoryInspectionConflictMessage("k")).toBe('Inspection request for key "k" conflicts with an already-created session.');
  });

  it("lists every fact key exactly once", () => {
    expect(new Set(inspectionKeys).size).toBe(11);
  });
});
