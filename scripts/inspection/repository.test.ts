// @vitest-environment node
/**
 * @fileoverview Contract tests for the composed repository inspection session.
 * @module scripts/inspection/repository.test
 *
 * @remarks
 * These tests exercise wiring, not domain correctness: every individual provider already has its
 * own focused test suite. `./aggregate.ts` and `./packages.ts` are partially mocked so the exact
 * number of times their real provider is *invoked* (not merely constructed) is directly
 * observable, which is the only reliable black-box signal for "shared through the same session
 * cache" versus "invoked directly, bypassing memoization" — both `createAggregateProvider` and
 * `createInstalledPackageProvider` otherwise expose no other externally observable per-call
 * signal (the aggregate provider's own process calls are behind an isolated worker process
 * boundary, and the package provider never runs a process at all). Every session runs over the
 * in-memory harness: an empty filesystem and a scripted `Process`.
 */

import {Deferred, Duration, Effect, Exit, Fiber, Scope} from "effect";
import {beforeEach, describe, expect, it, vi} from "vitest";

import {createRepositoryPaths} from "../common/repository-paths.ts";
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

const packagesProviderState = vi.hoisted(() => ({
  factoryCalls: 0,
  invocationCalls: 0,
  lastPackageNames: undefined as readonly string[] | undefined,
}));

const aggregateProviderState = vi.hoisted(() => ({
  factoryCalls: 0,
  invocationCalls: 0,
}));
vi.mock("./packages.ts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./packages.ts")>();
  return {
    ...actual,
    createInstalledPackageProvider: (input: Parameters<typeof actual.createInstalledPackageProvider>[0]) => {
      packagesProviderState.factoryCalls += 1;
      packagesProviderState.lastPackageNames = input.packageNames;
      const real = actual.createInstalledPackageProvider(input);
      return async () => {
        packagesProviderState.invocationCalls += 1;
        return real();
      };
    },
  };
});

vi.mock("./aggregate.ts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./aggregate.ts")>();
  return {
    ...actual,
    createAggregateProvider: (input: Parameters<typeof actual.createAggregateProvider>[0]) => {
      aggregateProviderState.factoryCalls += 1;
      const real = actual.createAggregateProvider(input);
      return async () => {
        aggregateProviderState.invocationCalls += 1;
        return real();
      };
    },
  };
});

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

/**
 * Builds a harness whose `Process` answers every request with `respond`.
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
): TestHarness {
  return makeTestLayer({
    environment: {platform: overrides.platform ?? "linux", cwd: repositoryPaths.root, isCI: true},
    processes: [{match: () => true, respond: overrides.respond ?? completedFailure}],
  });
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

beforeEach(() => {
  packagesProviderState.factoryCalls = 0;
  packagesProviderState.invocationCalls = 0;
  packagesProviderState.lastPackageNames = undefined;
  aggregateProviderState.factoryCalls = 0;
  aggregateProviderState.invocationCalls = 0;
});

// ============================================================================
// Tests
// ============================================================================

describe("createRepositoryInspectionSession aggregate wiring", () => {
  effectTest(
    "shares one aggregate provider invocation between concurrent inspections",
    () =>
      Effect.gen(function* () {
        // Arrange
        const session = yield* createRepositoryInspectionSession(requestFor("full"));

        // Act
        yield* Effect.all([session.inspect("aggregate"), session.inspect("aggregate")], {concurrency: 2});

        // Assert
        expect(aggregateProviderState.factoryCalls).toBe(1);
        expect(aggregateProviderState.invocationCalls).toBe(1);
      }),
    harnessFor().layer,
  );

  const quickHarness = harnessFor();
  effectTest(
    "never constructs the real aggregate worker provider under the quick profile",
    () =>
      Effect.gen(function* () {
        // Arrange
        const session = yield* createRepositoryInspectionSession(requestFor("quick"));

        // Act
        const outcome = yield* session.inspect("aggregate");

        // Assert
        expect(outcome.kind).toBe("unavailable");
        if (outcome.kind === "unavailable") {
          expect(outcome.reason).toMatch(/quick/iu);
        }
        expect(aggregateProviderState.factoryCalls).toBe(0);
        expect(aggregateProviderState.invocationCalls).toBe(0);
        expect(quickHarness.processCalls().some((call) => isAggregateWorker(call.request.args))).toBe(false);
      }),
    quickHarness.layer,
  );

  effectTest(
    "reuses the already-cached aggregate outcome when infrastructure is inspected afterward",
    () =>
      Effect.gen(function* () {
        // Arrange
        const session = yield* createRepositoryInspectionSession(requestFor("full"));
        yield* session.inspect("aggregate");
        expect(aggregateProviderState.invocationCalls).toBe(1);

        // Act
        yield* session.inspect("infrastructure");

        // Assert
        expect(aggregateProviderState.invocationCalls).toBe(1);
      }),
    harnessFor().layer,
  );
});

describe("createRepositoryInspectionSession packages wiring", () => {
  effectTest(
    "creates the packages provider exactly once with the exact INSPECTED_PACKAGE_NAMES inventory",
    () =>
      Effect.gen(function* () {
        // Arrange
        const session = yield* createRepositoryInspectionSession(requestFor("full"));

        // Act
        yield* session.inspect("packages");

        // Assert
        expect(packagesProviderState.factoryCalls).toBe(1);
        expect(packagesProviderState.lastPackageNames).toEqual(INSPECTED_PACKAGE_NAMES);
      }),
    harnessFor().layer,
  );

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
        expect(packagesProviderState.factoryCalls).toBe(1);
        expect(packagesProviderState.invocationCalls).toBe(1);
      }),
    harnessFor().layer,
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

  effectTest(
    "only refreshes React's package facts after both packages and its own key are invalidated",
    () =>
      Effect.gen(function* () {
        // Arrange
        const session = yield* createRepositoryInspectionSession(requestFor("full"));
        yield* session.inspect("react");
        expect(packagesProviderState.invocationCalls).toBe(1);

        // Act + Assert: invalidating "packages" alone does not retroactively refresh an already-cached "react".
        yield* session.invalidate("packages");
        yield* session.inspect("react");
        expect(packagesProviderState.invocationCalls).toBe(1);

        // Only invalidating both the dependency and the consumer's own key forces a fresh read.
        yield* session.invalidate("packages", "react");
        yield* session.inspect("react");
        expect(packagesProviderState.invocationCalls).toBe(2);
      }),
    harnessFor().layer,
  );

  effectTest(
    "only refreshes Svelte's package facts after both packages and its own key are invalidated",
    () =>
      Effect.gen(function* () {
        // Arrange
        const session = yield* createRepositoryInspectionSession(requestFor("full"));
        yield* session.inspect("svelte.cv");
        expect(packagesProviderState.invocationCalls).toBe(1);

        // Act + Assert
        yield* session.invalidate("packages");
        yield* session.inspect("svelte.cv");
        expect(packagesProviderState.invocationCalls).toBe(1);

        yield* session.invalidate("packages", "svelte.cv");
        yield* session.inspect("svelte.cv");
        expect(packagesProviderState.invocationCalls).toBe(2);
      }),
    harnessFor().layer,
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
