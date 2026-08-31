/**
 * @fileoverview Composes every repository inspection provider into one shared, memoized session.
 * @module scripts/inspection/repository
 *
 * @remarks
 * This module performs pure composition: it never implements domain inspection logic itself.
 * One {@link InspectionProbeRunner} is created from the caller's {@link CommandRunner} and shared
 * by every probe-driven provider; one shared installed-package provider is registered under the
 * `"packages"` key for the exact {@link INSPECTED_PACKAGE_NAMES} inventory; and the React, both
 * Svelte, and infrastructure providers receive lazy closures that call back into the composed
 * session (`session.inspect("packages")`, `session.inspect("aggregate")`) instead of ever
 * constructing their own provider or bypassing the session's memoization. The session binding is
 * declared before those closures are built and assigned only once every provider is registered, so
 * a closure can safely capture it: none of the closures can execute until a caller receives the
 * returned session and calls `inspect`, by which point the binding is always assigned.
 *
 * Under the `"quick"` profile, `"aggregate"` never constructs the isolated aggregate worker
 * provider at all: it is wired to a bounded provider that immediately reports the fact as
 * unavailable with a fixed, redacted reason identifying the quick profile, so the `envinfo`/
 * `systeminformation` worker process is never spawned.
 */

import type {CommandRunner} from "../common/process.ts";
import type {RepositoryPaths} from "../common/repository-paths.ts";
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
export type RepositoryInspectionSession = InspectionSession<RepositoryInspectionFacts>;

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
 * @param input - Inspection profile, canonical repository paths, shared command runner, optional
 * requested container engine, isolated environment, target platform, and monotonic time source.
 * @returns A session exposing memoized `inspect` and key-scoped `invalidate` across every
 * {@link RepositoryInspectionFacts} key.
 */
export function createRepositoryInspectionSession(
  input: Readonly<{
    profile: InspectionProfile;
    paths: RepositoryPaths;
    runner: CommandRunner;
    requestedEngine?: ContainerEngine;
    env: Readonly<NodeJS.ProcessEnv>;
    platform: NodeJS.Platform;
    now: () => number;
  }>,
): RepositoryInspectionSession {
  const probes = createInspectionProbeRunner(input.runner);

  // Declared before assignment so the lazy `packages`/`aggregate` closures below can capture this
  // exact binding. Neither closure can run before a caller receives the session below and calls
  // `inspect`, so the binding is always assigned by the time either closure executes.
  let session: RepositoryInspectionSession;

  const frontendInput: FrontendProviderInput = {
    paths: input.paths,
    packages: (): Promise<InspectionOutcome<PackageInventoryFacts>> => session.inspect("packages"),
    probes,
    now: input.now,
  };

  const providers: InspectionProviders<RepositoryInspectionFacts> = {
    workspace: createWorkspaceProvider({root: input.paths.root, runner: input.runner, now: input.now}),
    aggregate:
      input.profile === "quick"
        ? createQuickAggregateProvider(input.now)
        : createAggregateProvider({root: input.paths.root, runner: input.runner, now: input.now}),
    "npm.root": createNpmTreeProvider({scope: "root", root: input.paths.root, probes, now: input.now}),
    "npm.github-scripts": createNpmTreeProvider({
      scope: "github-scripts",
      root: input.paths.githubScriptsRoot,
      probes,
      now: input.now,
    }),
    packages: createInstalledPackageProvider({root: input.paths.root, packageNames: INSPECTED_PACKAGE_NAMES, now: input.now}),
    dotnet: createDotnetProvider({paths: input.paths, probes, platform: input.platform, now: input.now}),
    python: createPythonProvider({paths: input.paths, probes, platform: input.platform, now: input.now}),
    react: createReactProvider(frontendInput),
    "svelte.cv": createSvelteProvider("cv", frontendInput),
    "svelte.status": createSvelteProvider("status", frontendInput),
    infrastructure: createInfrastructureProvider({
      paths: input.paths,
      probes,
      aggregate: (): Promise<InspectionOutcome<AggregateFacts>> => session.inspect("aggregate"),
      ...(input.requestedEngine === undefined ? {} : {requestedEngine: input.requestedEngine}),
      env: input.env,
      platform: input.platform,
      now: input.now,
    }),
  };

  session = createInspectionSession<RepositoryInspectionFacts>(providers);
  return session;
}
