/**
 * @fileoverview Temporary adapter that runs the Promise inspection providers inside the Effect
 * repository session.
 * @module scripts/inspection/legacy-provider
 *
 * @remarks
 * Task 4.2 converts the session, probes, and repository composition to Effect while every
 * provider module keeps its legacy Promise signature until Task 4.3. This module bridges that gap:
 * it keeps the legacy provider contracts, builds each Promise provider from the
 * {@link LegacyInspectionCapabilities} the bridge derives from the Effect inspection services, and
 * lifts each one into an Effect {@link InspectionProvider} whose rejection is a defect. It never
 * runs an Effect itself. **Deleted in Task 4.3.**
 */

import {Effect} from "effect";

import type {ProcessRunner} from "../common/runner.ts";
import type {Clock, FileSystem, ReadOnlyFileSystem, RuntimeEnvironment, TaskScheduler} from "../common/runtime.ts";
import type {ContainerEngine} from "../container-runtime/types.ts";
import type {LegacyInspectionCapabilities} from "../platform/bridge.ts";
import {createAggregateProvider, type AggregateFacts} from "./aggregate.ts";
import {createDotnetProvider} from "./dotnet.ts";
import {createReactProvider, createSvelteProvider, type FrontendProviderInput} from "./frontend.ts";
import {createInfrastructureProvider} from "./infrastructure.ts";
import {createInstalledPackageProvider, createNpmTreeProvider, INSPECTED_PACKAGE_NAMES, type PackageInventoryFacts} from "./packages.ts";
import {createInspectionProbeRunner} from "./probes.ts";
import {createPythonProvider} from "./python.ts";
import type {RepositoryInspectionFacts, RepositoryInspectionRequest} from "./repository.ts";
import type {InspectionOutcome, InspectionProvider, InspectionProviders} from "./types.ts";
import {createWorkspaceProvider} from "./workspace.ts";

/** The legacy capability surface a Promise inspection provider observes. Deleted in Task 4.3. */
export interface LegacyInspectionProviderContext {
  /** Read-only filesystem every provider observes repository state through. */
  readonly files: ReadOnlyFileSystem;
  /** The single writable capability: creation of one caller-owned temporary directory. */
  readonly temporaryDirectories: Pick<FileSystem, "createTemporaryDirectory">;
  /** Engine-neutral child-process runner used by probe- and worker-driven providers. */
  readonly runner: ProcessRunner;
  /** Monotonic and wall-clock time source used for every `durationMs` measurement. */
  readonly clock: Clock;
  /** Deterministic task orchestration used instead of raw `Promise` combinators. */
  readonly tasks: TaskScheduler;
  /** Immutable environment snapshot providers read variables, platform, and paths from. */
  readonly environment: RuntimeEnvironment;
  /** Cancellation signal of the owning session. */
  readonly signal: AbortSignal;
}

/** Produces one {@link InspectionOutcome} as a promise; a rejection is exceptional. Deleted in Task 4.3. */
export type LegacyInspectionProvider<T> = () => Promise<InspectionOutcome<T>>;

/**
 * Lifts a Promise provider into an Effect {@link InspectionProvider}; a rejection (or synchronous
 * throw) becomes a defect, as it was exceptional before.
 *
 * @param provider - The Promise provider.
 * @returns The equivalent Effect provider.
 */
export function fromLegacyProvider<T>(provider: LegacyInspectionProvider<T>): InspectionProvider<T> {
  return Effect.promise(() => provider());
}

/** Inputs of {@link legacyRepositoryProviders}. */
export interface LegacyRepositoryProvidersInput {
  /** The session request. */
  readonly request: Readonly<RepositoryInspectionRequest>;
  /** Legacy capabilities over the session's Effect services. */
  readonly capabilities: LegacyInspectionCapabilities;
  /** Resolves a dependent fact through the composed session (memoized there). */
  readonly inspect: <K extends keyof RepositoryInspectionFacts>(key: K) => Promise<InspectionOutcome<RepositoryInspectionFacts[K]>>;
  /** Reads the engine the infrastructure provider observes on each run. */
  readonly resolveEngine: () => ContainerEngine | undefined;
}

/**
 * Builds the full-profile aggregate provider over the legacy capabilities.
 *
 * @param input - Request and capabilities.
 * @returns The aggregate worker provider.
 */
export function legacyAggregateProvider(
  input: Readonly<Omit<LegacyRepositoryProvidersInput, "inspect" | "resolveEngine">>,
): InspectionProvider<AggregateFacts> {
  const {capabilities} = input;
  return fromLegacyProvider(
    createAggregateProvider({
      root: input.request.paths.root,
      runner: capabilities.runner,
      clock: capabilities.clock,
      environment: capabilities.environment,
    }),
  );
}

/**
 * Builds every repository provider except `"aggregate"` over the legacy capabilities.
 *
 * @remarks
 * One legacy probe runner over the capabilities' runner is shared by every probe-driven provider,
 * the shared package inventory is registered under `"packages"`, and React, both Svelte projects,
 * and infrastructure resolve their dependency through `input.inspect` so it stays memoized by the
 * session.
 *
 * @param input - Request, capabilities, session callback, and engine reader.
 * @returns Every provider except `"aggregate"`.
 */
export function legacyRepositoryProviders(
  input: Readonly<LegacyRepositoryProvidersInput>,
): Omit<InspectionProviders<RepositoryInspectionFacts>, "aggregate"> {
  const {request, capabilities} = input;
  const {files, temporaryDirectories, runner, clock, tasks, environment} = capabilities;
  const {paths} = request;
  const probes = createInspectionProbeRunner(runner);

  const frontendInput: FrontendProviderInput = {
    paths,
    packages: (): Promise<InspectionOutcome<PackageInventoryFacts>> => input.inspect("packages"),
    probes,
    files,
    clock,
    tasks,
  };

  return {
    workspace: fromLegacyProvider(createWorkspaceProvider({root: paths.root, runner, clock, environment, temporaryDirectories})),
    "npm.root": fromLegacyProvider(createNpmTreeProvider({scope: "root", root: paths.root, probes, clock})),
    "npm.github-scripts": fromLegacyProvider(
      createNpmTreeProvider({scope: "github-scripts", root: paths.githubScriptsRoot, probes, clock}),
    ),
    packages: fromLegacyProvider(
      createInstalledPackageProvider({root: paths.root, packageNames: INSPECTED_PACKAGE_NAMES, files, clock, tasks}),
    ),
    dotnet: fromLegacyProvider(createDotnetProvider({paths, probes, files, clock, tasks, environment})),
    python: fromLegacyProvider(createPythonProvider({paths, probes, files, clock, tasks, environment})),
    react: fromLegacyProvider(createReactProvider(frontendInput)),
    "svelte.cv": fromLegacyProvider(createSvelteProvider("cv", frontendInput)),
    "svelte.status": fromLegacyProvider(createSvelteProvider("status", frontendInput)),
    infrastructure: fromLegacyProvider(
      createInfrastructureProvider({
        paths,
        probes,
        aggregate: (): Promise<InspectionOutcome<AggregateFacts>> => input.inspect("aggregate"),
        resolveEngine: input.resolveEngine,
        files,
        clock,
        tasks,
        environment,
      }),
    ),
  };
}
