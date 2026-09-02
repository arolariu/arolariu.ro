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
 * signal (the aggregate provider's own command runner calls are behind an isolated worker
 * process boundary, and the package provider never calls the injected command runner at all).
 */

import {beforeEach, describe, expect, it, vi} from "vitest";

import type {ProcessOutcome, ProcessRequest, ProcessRunner} from "../common/runner.ts";
import {resolveRepositoryPaths, type RepositoryPaths} from "../common/repository-paths.ts";
import {nodeFileSystem} from "../common/runtime.node.ts";
import {asReadOnlyFileSystem, DefaultTaskScheduler, type Clock, type FileSystem, type RuntimeEnvironment} from "../common/runtime.ts";
import {INSPECTED_PACKAGE_NAMES} from "./packages.ts";
import {createRepositoryInspectionSession, type RepositoryInspectionSession} from "./repository.ts";

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

/** Canonical real repository paths; every read this suite triggers is read-only. */
const repositoryPaths: RepositoryPaths = await resolveRepositoryPaths(import.meta.url, nodeFileSystem);

/** Monotonically increasing fake clock, matching the pattern used by sibling provider tests. */
function clock(): Clock {
  let current = 0;
  return {
    monotonicNow: (): number => {
      current += 1;
      return current;
    },
    isoTimestamp: (): string => "2025-01-01T00:00:00.000Z",
    delay: (): Promise<void> => Promise.resolve(),
  };
}

/** Immutable environment every composed provider observes; the platform is fixed for determinism. */
function environmentFor(platform: NodeJS.Platform): RuntimeEnvironment {
  return {
    variables: {},
    cwd: repositoryPaths.root,
    executablePath: "/usr/bin/node",
    platform,
    architecture: "x64",
    stdinIsTTY: false,
    stdoutIsTTY: false,
    isCI: true,
  };
}

/** Narrow temporary-directory capability shared by the composed Nx workspace provider. */
const temporaryDirectories: Pick<FileSystem, "createTemporaryDirectory"> = {
  createTemporaryDirectory: (prefix) => nodeFileSystem.createTemporaryDirectory(prefix),
};

/** A fake {@link ProcessRunner} that reports every command as a bounded, non-throwing failure. */
function createFakeRunner(): {runner: ProcessRunner; calls: Readonly<ProcessRequest>[]} {
  const calls: Readonly<ProcessRequest>[] = [];
  const run = vi.fn(async (command: Readonly<ProcessRequest>): Promise<ProcessOutcome> => {
    calls.push(command);
    return {kind: "exited", exitCode: 1, stdout: "", stderr: "", durationMs: 1};
  });
  const runner: ProcessRunner = {
    run,
    expectSuccess: () => {
      throw new Error("The composed session never calls expectSuccess.");
    },
    scope: () => {
      throw new Error("The composed session never scopes the shared runner.");
    },
  };
  return {runner, calls};
}

/** Builds one repository inspection session over a fresh fake runner for one test. */
function buildSession(overrides: Readonly<Partial<{profile: "full" | "quick"; platform: NodeJS.Platform; runner: ProcessRunner}>> = {}): {
  session: RepositoryInspectionSession;
  runnerCalls: Readonly<ProcessRequest>[];
} {
  const fake = createFakeRunner();
  const runner = overrides.runner ?? fake.runner;
  const session = createRepositoryInspectionSession({
    profile: overrides.profile ?? "full",
    paths: repositoryPaths,
    runner,
    files: asReadOnlyFileSystem(nodeFileSystem),
    temporaryDirectories,
    clock: clock(),
    tasks: new DefaultTaskScheduler(),
    environment: environmentFor(overrides.platform ?? "linux"),
    signal: new AbortController().signal,
  });
  return {session, runnerCalls: fake.calls};
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
  it("shares one aggregate provider invocation between concurrent inspections", async () => {
    const {session} = buildSession({profile: "full"});

    await Promise.all([session.inspect("aggregate"), session.inspect("aggregate")]);

    expect(aggregateProviderState.factoryCalls).toBe(1);
    expect(aggregateProviderState.invocationCalls).toBe(1);
  });

  it("never constructs the real aggregate worker provider under the quick profile", async () => {
    const {session, runnerCalls} = buildSession({profile: "quick"});

    const outcome = await session.inspect("aggregate");

    expect(outcome.kind).toBe("unavailable");
    if (outcome.kind === "unavailable") {
      expect(outcome.reason).toMatch(/quick/iu);
    }
    expect(aggregateProviderState.factoryCalls).toBe(0);
    expect(aggregateProviderState.invocationCalls).toBe(0);
    expect(runnerCalls.some((call) => call.args.some((arg) => arg.includes("aggregate-worker")))).toBe(false);
  });

  it("reuses the already-cached aggregate outcome when infrastructure is inspected afterward", async () => {
    const {session} = buildSession({profile: "full"});

    await session.inspect("aggregate");
    expect(aggregateProviderState.invocationCalls).toBe(1);

    await session.inspect("infrastructure");

    expect(aggregateProviderState.invocationCalls).toBe(1);
  });
});

describe("createRepositoryInspectionSession packages wiring", () => {
  it("creates the packages provider exactly once with the exact INSPECTED_PACKAGE_NAMES inventory", async () => {
    const {session} = buildSession({profile: "full"});

    await session.inspect("packages");

    expect(packagesProviderState.factoryCalls).toBe(1);
    expect(packagesProviderState.lastPackageNames).toEqual(INSPECTED_PACKAGE_NAMES);
  });

  it("shares one memoized packages outcome across concurrent React and Svelte inspections", async () => {
    const {session} = buildSession({profile: "full"});

    await Promise.all([session.inspect("react"), session.inspect("svelte.cv"), session.inspect("svelte.status")]);

    expect(packagesProviderState.factoryCalls).toBe(1);
    expect(packagesProviderState.invocationCalls).toBe(1);
  });
});

describe("createRepositoryInspectionSession targeted invalidation", () => {
  it("does not rerun dotnet when only python is invalidated", async () => {
    // An unsupported platform makes both providers resolve immediately without any command
    // execution, isolating this test from every other inspection concern.
    const {session} = buildSession({platform: "aix" as NodeJS.Platform});

    const firstDotnet = session.inspect("dotnet");
    await session.inspect("python");
    await firstDotnet;

    session.invalidate("python");

    const secondDotnet = session.inspect("dotnet");
    expect(secondDotnet).toBe(firstDotnet);
    await expect(secondDotnet).resolves.toEqual(await firstDotnet);
  });

  it("only refreshes React's package facts after both packages and its own key are invalidated", async () => {
    const {session} = buildSession({profile: "full"});

    await session.inspect("react");
    expect(packagesProviderState.invocationCalls).toBe(1);

    // Invalidating "packages" alone does not retroactively refresh an already-cached "react".
    session.invalidate("packages");
    await session.inspect("react");
    expect(packagesProviderState.invocationCalls).toBe(1);

    // Only invalidating both the dependency and the consumer's own key forces a fresh read.
    session.invalidate("packages", "react");
    await session.inspect("react");
    expect(packagesProviderState.invocationCalls).toBe(2);
  });

  it("only refreshes Svelte's package facts after both packages and its own key are invalidated", async () => {
    const {session} = buildSession({profile: "full"});

    await session.inspect("svelte.cv");
    expect(packagesProviderState.invocationCalls).toBe(1);

    session.invalidate("packages");
    await session.inspect("svelte.cv");
    expect(packagesProviderState.invocationCalls).toBe(1);

    session.invalidate("packages", "svelte.cv");
    await session.inspect("svelte.cv");
    expect(packagesProviderState.invocationCalls).toBe(2);
  });
});

// ============================================================================
// updateInfrastructureEngine + invalidation + reinspection
// ============================================================================

describe("createRepositoryInspectionSession updateInfrastructureEngine", () => {
  it("exposes updateInfrastructureEngine as a function on the returned session", () => {
    const {session} = buildSession();
    expect(typeof session.updateInfrastructureEngine).toBe("function");
  });

  it("updateInfrastructureEngine followed by invalidate and reinspect causes the composed infrastructure provider to observe the updated engine", async () => {
    // Build a session with no initial engine so the first infrastructure inspection skips engine probes.
    const {session} = buildSession({platform: "aix" as NodeJS.Platform});

    const first = await session.inspect("infrastructure");
    expect(first.kind).toBe("available");
    const firstFacts = (first as Readonly<{value: {selectedEngine?: string}}>).value;
    expect(firstFacts.selectedEngine).toBeUndefined();

    // Update the engine to "podman", invalidate, and reinspect.
    session.updateInfrastructureEngine("podman");
    session.invalidate("infrastructure");

    const second = await session.inspect("infrastructure");
    expect(second.kind).toBe("available");
    const secondFacts = (second as Readonly<{value: {selectedEngine?: string}}>).value;
    expect(secondFacts.selectedEngine).toBe("podman");
  });

  it("updateInfrastructureEngine without invalidation does not change the cached outcome", async () => {
    const {session} = buildSession({platform: "aix" as NodeJS.Platform});

    const first = await session.inspect("infrastructure");
    session.updateInfrastructureEngine("rancher");

    // Without invalidation, the cached outcome is returned.
    const second = await session.inspect("infrastructure");
    expect(second).toBe(first);
  });

  it("exact infrastructure invalidation does not disturb other cached keys", async () => {
    const {session} = buildSession({platform: "aix" as NodeJS.Platform});

    // Cache both workspace and infrastructure — capture the workspace promise identity.
    const workspacePromise = session.inspect("workspace");
    await session.inspect("infrastructure");
    await workspacePromise;

    // Invalidate only infrastructure.
    session.updateInfrastructureEngine("podman");
    session.invalidate("infrastructure");

    // Workspace's cached promise identity is preserved (same memoized promise reference).
    const workspaceAfterPromise = session.inspect("workspace");
    expect(workspaceAfterPromise).toBe(workspacePromise);
  });
});
