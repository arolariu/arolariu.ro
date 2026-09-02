/**
 * @fileoverview Composes every repository inspection provider into one shared, memoized session.
 * @module scripts/inspection/repository
 *
 * @remarks
 * This module performs pure composition: it never implements domain inspection logic itself.
 * One {@link InspectionProbeRunner} is created from the caller's {@link ProcessRunner} and shared
 * by every probe-driven provider; one shared installed-package provider is registered under the
 * `"packages"` key for the exact {@link INSPECTED_PACKAGE_NAMES} inventory; and the React, both
 * Svelte, and infrastructure providers receive lazy closures that call back into the composed
 * session (`session.inspect("packages")`, `session.inspect("aggregate")`) instead of ever
 * constructing their own provider or bypassing the session's memoization. The session binding is
 * declared before those closures are built and assigned only once every provider is registered, so
 * a closure can safely capture it: none of the closures can execute until a caller receives the
 * returned session and calls `inspect`, by which point the binding is always assigned.
 *
 * Every provider receives narrow capability picks rather than ambient state: an ordinary provider
 * only ever sees the read-only filesystem, and only the isolated Nx workspace provider receives the
 * narrow temporary-directory capability it needs for its disposable Nx state root. The shared
 * process runner is scoped to the owning invocation's cancellation signal, and every provider is
 * registered behind the same signal, so cancellation reaches probes and isolated workers instead
 * of being degraded into an `"unavailable"` fact.
 *
 * Under the `"quick"` profile, `"aggregate"` never constructs the isolated aggregate worker
 * provider at all: it is wired to a bounded provider that immediately reports the fact as
 * unavailable with a fixed, redacted reason identifying the quick profile, so the `envinfo`/
 * `systeminformation` worker process is never spawned.
 */

import type {ProcessRunner} from "../common/runner.ts";
import type {Clock, FileSystem, ReadOnlyFileSystem, RepositoryInspectionRequest, RuntimeEnvironment, TaskScheduler} from "../common/runtime.ts";
import {commandCancellationFromSignal} from "../common/runtime.ts";
import type {ContainerEngine} from "../container-runtime/types.ts";
import {createAggregateProvider, type AggregateFacts} from "./aggregate.ts";
import {createDotnetProvider, type DotnetFacts} from "./dotnet.ts";
import {createReactProvider, createSvelteProvider, type FrontendProviderInput, type ReactFacts, type SvelteFacts} from "./frontend.ts";
import {createInfrastructureProvider, type InfrastructureFacts} from "./infrastructure.ts";
import {
  createInstalledPackageProvider,
  createNpmTreeProvider,
  INSPECTED_PACKAGE_NAMES,
  type NpmTreeFacts,
  type PackageInventoryFacts,
} from "./packages.ts";
import {createInspectionProbeRunner} from "./probes.ts";
import {createPythonProvider, type PythonFacts} from "./python.ts";
import {createInspectionSession} from "./session.ts";
import type {InspectionOutcome, InspectionProvider, InspectionProviders, InspectionSession} from "./types.ts";
import {createWorkspaceProvider, type WorkspaceFacts} from "./workspace.ts";

/** Selects how thoroughly {@link createRepositoryInspectionSession} inspects the repository. */
export type InspectionProfile = "full" | "quick";

/** Every repository fact reachable through one composed {@link RepositoryInspectionSession}. */
export interface RepositoryInspectionFacts {
  readonly workspace: WorkspaceFacts;
  readonly aggregate: AggregateFacts;
  readonly "npm.root": NpmTreeFacts;
  readonly "npm.github-scripts": NpmTreeFacts;
  readonly packages: PackageInventoryFacts;
  readonly dotnet: DotnetFacts;
  readonly python: PythonFacts;
  readonly react: ReactFacts;
  readonly "svelte.cv": SvelteFacts;
  readonly "svelte.status": SvelteFacts;
  readonly infrastructure: InfrastructureFacts;
}

/** One key of {@link RepositoryInspectionFacts}. */
export type RepositoryInspectionKey = keyof RepositoryInspectionFacts;

/** A memoized inspection session composed over every {@link RepositoryInspectionFacts} key. */
export interface RepositoryInspectionSession extends InspectionSession<RepositoryInspectionFacts> {
  /**
   * Updates the container engine that the `"infrastructure"` provider observes on its next
   * invocation, without creating a second session or duplicating the provider.
   *
   * @remarks
   * This setter does **not** invalidate any fact key by itself: the caller must follow it with
   * an explicit {@link InspectionSession.invalidate | invalidate("infrastructure")} call (and
   * optionally `"aggregate"`) when the new engine should be observed by a subsequent
   * {@link InspectionSession.inspect | inspect("infrastructure")} call. Separating the update
   * from invalidation lets callers batch an engine change with other state transitions before
   * invalidating once.
   *
   * @param engine - The newly selected container engine.
   */
  readonly updateInfrastructureEngine: (engine: ContainerEngine) => void;
}

/** Fixed, redacted reason reported for `"aggregate"` under the quick inspection profile. */
const QUICK_PROFILE_AGGREGATE_REASON = "Aggregate inspection is skipped under the quick inspection profile.";

/**
 * Measures elapsed wall-clock time as a non-negative, finite duration.
 *
 * @param startedAt - Value from `now()` captured before the inspection began.
 * @param now - Monotonic time source.
 * @returns A non-negative, finite duration in milliseconds.
 */
function elapsedMilliseconds(startedAt: number, now: () => number): number {
  const elapsed = now() - startedAt;
  return Number.isFinite(elapsed) ? Math.max(0, elapsed) : 0;
}

/** Every capability {@link createRepositoryInspectionSession} needs, plus the caller's request. */
export interface RepositoryInspectionSessionOptions extends RepositoryInspectionRequest {
  /** Engine-neutral child-process runner shared by every probe- and worker-driven provider. */
  readonly runner: ProcessRunner;
  /** Read-only filesystem every ordinary provider observes repository state through. */
  readonly files: ReadOnlyFileSystem;
  /** The single writable capability: creation of one caller-owned temporary directory. */
  readonly temporaryDirectories: Pick<FileSystem, "createTemporaryDirectory">;
  /** Monotonic and wall-clock time source used for every `durationMs` measurement. */
  readonly clock: Clock;
  /** Deterministic task orchestration used instead of raw `Promise` combinators. */
  readonly tasks: TaskScheduler;
  /** Immutable environment snapshot providers read variables, platform, and paths from. */
  readonly environment: RuntimeEnvironment;
  /** Cancellation signal of the owning command invocation. */
  readonly signal: AbortSignal;
}

/**
 * Creates one {@link RepositoryInspectionSession} for a caller's request.
 *
 * @remarks
 * The runtime's memoized inspection registry owns exactly one factory of this shape, so a command
 * never assembles capabilities itself.
 */
export type RepositoryInspectionSessionFactory = (
  request: Readonly<RepositoryInspectionRequest>,
) => RepositoryInspectionSession;

/**
 * Creates the bounded `"aggregate"` provider used under the quick inspection profile.
 *
 * @remarks
 * This provider never references {@link createAggregateProvider}, so the isolated aggregate
 * worker process (`aggregate-worker.ts`, which imports the broad `envinfo`/`systeminformation`
 * collectors) can never be spawned while a quick-profile session is in use, even if `"aggregate"`
 * is inspected repeatedly or concurrently.
 *
 * @param now - Monotonic time source used to measure `durationMs`.
 * @returns A provider that always resolves to a fixed `"unavailable"` outcome.
 */
function createQuickAggregateProvider(now: () => number): InspectionProvider<AggregateFacts> {
  return async (): Promise<InspectionOutcome<AggregateFacts>> => {
    const startedAt = now();
    return {
      kind: "unavailable",
      reason: QUICK_PROFILE_AGGREGATE_REASON,
      durationMs: elapsedMilliseconds(startedAt, now),
    };
  };
}

/**
 * Rejects an inspection whose owning command invocation was cancelled.
 *
 * @remarks
 * Cancellation is not an inspection fact: RFC 0002 section 7.3 lets only explicit business policy
 * degrade a failure, and section 9.5 requires a cancelled invocation to stay a command-execution
 * failure. Reporting a cancelled probe or worker as an `"unavailable"` fact would hide an
 * interrupted run inside an otherwise successful report, so the invocation's typed
 * {@link CommandCancellation} is raised instead and the command lifecycle classifies it once.
 *
 * @param signal - Cancellation signal of the owning command invocation.
 * @throws {CommandCancellation} When `signal` is already aborted.
 */
function throwIfCancelled(signal: AbortSignal): void {
  if (signal.aborted) {
    throw commandCancellationFromSignal(signal);
  }
}

/**
 * Composes every repository inspection provider into one shared, memoized
 * {@link RepositoryInspectionSession}.
 *
 * @remarks
 * Construction is deterministic and free of module-level state: every provider is built fresh
 * from `input` and registered on a session created only for this call. React, both Svelte
 * projects, and infrastructure never receive their dependency (the shared package inventory or
 * the aggregate facts) directly; they receive a lazy closure over `session.inspect(...)` so every
 * dependent fact is resolved and memoized through the same typed cache as a direct caller would
 * observe, and a targeted {@link InspectionSession.invalidate} call only ever forces the exact
 * keys it names to be recomputed.
 *
 * Every provider is registered behind the invocation's cancellation signal, and the shared runner
 * is scoped to that same signal, so a cancelled invocation aborts in-flight probes and workers
 * instead of waiting out their bounded timeouts, and no provider can report a cancelled run as a
 * degraded fact. Wrapping each provider (rather than the session) keeps the memoized promise
 * identity and the reject-evicts-its-own-entry semantics of {@link createInspectionSession}
 * unchanged.
 *
 * @param options - Inspection profile, canonical repository paths, optional requested container
 * engine, and the runner, read-only filesystem, temporary-directory, clock, task-scheduler,
 * environment, and cancellation capabilities every provider observes.
 * @returns A session exposing memoized `inspect` and key-scoped `invalidate` across every
 * {@link RepositoryInspectionFacts} key.
 */
export function createRepositoryInspectionSession(
  options: Readonly<RepositoryInspectionSessionOptions>,
): RepositoryInspectionSession {
  const {files, temporaryDirectories, clock, tasks, environment, signal} = options;
  const now = (): number => clock.monotonicNow();
  const runner = options.runner.scope({signal});
  const probes = createInspectionProbeRunner(runner);

  const cancellable = <T>(provider: InspectionProvider<T>): InspectionProvider<T> =>
    async (): Promise<InspectionOutcome<T>> => {
      throwIfCancelled(signal);
      const outcome = await provider();
      throwIfCancelled(signal);
      return outcome;
    };

  // Mutable engine variable: starts with the Commander-level requested engine and can be updated
  // later by `updateInfrastructureEngine` (from environment, persisted config, or interactive
  // prompt). The infrastructure provider reads this lazily through `resolveEngine` each time it
  // runs, so an invalidate-then-inspect cycle always observes the current selection.
  let currentEngine: ContainerEngine | undefined = options.requestedEngine;

  // Declared before assignment so the lazy `packages`/`aggregate` closures below can capture this
  // exact binding. Neither closure can run before a caller receives the session below and calls
  // `inspect`, so the binding is always assigned by the time either closure executes.
  let session: RepositoryInspectionSession;

  const frontendInput: FrontendProviderInput = {
    paths: options.paths,
    packages: (): Promise<InspectionOutcome<PackageInventoryFacts>> => session.inspect("packages"),
    probes,
    files,
    clock,
    tasks,
  };

  const providers: InspectionProviders<RepositoryInspectionFacts> = {
    workspace: cancellable(
      createWorkspaceProvider({
        root: options.paths.root,
        runner,
        clock,
        environment,
        temporaryDirectories,
      }),
    ),
    aggregate: cancellable(
      options.profile === "quick"
        ? createQuickAggregateProvider(now)
        : createAggregateProvider({root: options.paths.root, runner, clock, environment}),
    ),
    "npm.root": cancellable(createNpmTreeProvider({scope: "root", root: options.paths.root, probes, clock})),
    "npm.github-scripts": cancellable(
      createNpmTreeProvider({
        scope: "github-scripts",
        root: options.paths.githubScriptsRoot,
        probes,
        clock,
      }),
    ),
    packages: cancellable(
      createInstalledPackageProvider({
        root: options.paths.root,
        packageNames: INSPECTED_PACKAGE_NAMES,
        files,
        clock,
        tasks,
      }),
    ),
    dotnet: cancellable(createDotnetProvider({paths: options.paths, probes, files, clock, tasks, environment})),
    python: cancellable(createPythonProvider({paths: options.paths, probes, files, clock, tasks, environment})),
    react: cancellable(createReactProvider(frontendInput)),
    "svelte.cv": cancellable(createSvelteProvider("cv", frontendInput)),
    "svelte.status": cancellable(createSvelteProvider("status", frontendInput)),
    infrastructure: cancellable(
      createInfrastructureProvider({
        paths: options.paths,
        probes,
        aggregate: (): Promise<InspectionOutcome<AggregateFacts>> => session.inspect("aggregate"),
        resolveEngine: (): ContainerEngine | undefined => currentEngine,
        files,
        clock,
        tasks,
        environment,
      }),
    ),
  };

  const baseSession = createInspectionSession<RepositoryInspectionFacts>(providers);
  session = {
    inspect: baseSession.inspect,
    invalidate: baseSession.invalidate,
    updateInfrastructureEngine: (engine: ContainerEngine): void => {
      currentEngine = engine;
    },
  };
  return session;
}
