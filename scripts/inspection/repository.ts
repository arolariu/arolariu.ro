/**
 * @fileoverview Composes every repository inspection provider into one shared, memoized session.
 * @module scripts/inspection/repository
 *
 * @remarks
 * This module performs pure composition: it never implements domain inspection logic itself.
 * {@link createRepositoryInspectionSession} builds one provider per {@link RepositoryInspectionFacts}
 * key over the current {@link InspectionRequirements} services and registers them on one
 * {@link createInspectionSession} session. The React, both Svelte, and infrastructure providers
 * resolve their dependency (`"packages"`, `"aggregate"`) through that same session instead of ever
 * constructing their own provider or bypassing its memoization.
 *
 * Under the `"quick"` profile, `"aggregate"` never constructs the isolated aggregate worker
 * provider at all: it is wired to a bounded provider that immediately reports the fact as
 * unavailable with a fixed, redacted reason identifying the quick profile, so the `envinfo`/
 * `systeminformation` worker process is never spawned.
 *
 * Every provider runs its processes as child fibers and owns its temporary directories in its own
 * scope, so closing the session scope interrupts every in-flight provider, stops its processes, and
 * only then removes the directories they used.
 */

import {Effect, type Scope} from "effect";

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
import {inspectionProbeRunner} from "./probes.ts";
import {createPythonProvider, type PythonFacts} from "./python.ts";
import {createInspectionSession} from "./session.ts";
import type {InspectionOutcome, InspectionProvider, InspectionProviders, InspectionRequirements, InspectionSession} from "./types.ts";
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
   * Updates the container engine that the `"infrastructure"` provider observes on its next run,
   * without creating a second session or duplicating the provider.
   *
   * @remarks
   * This does **not** invalidate any fact key by itself: the caller must follow it with an
   * explicit {@link InspectionSession.invalidate | invalidate("infrastructure")} (and optionally
   * `"aggregate"`) when the new engine should be observed by a later
   * {@link InspectionSession.inspect | inspect("infrastructure")}. Separating the update from
   * invalidation lets callers batch an engine change with other state transitions.
   *
   * @param engine - The newly selected container engine.
   */
  readonly updateInfrastructureEngine: (engine: ContainerEngine) => Effect.Effect<void>;
}

/** Selects how thoroughly a repository inspection session inspects the repository. */
export interface RepositoryInspectionRequest {
  /** Inspection thoroughness profile. */
  readonly profile: InspectionProfile;
  /** Canonical repository paths the session inspects. */
  readonly paths: RepositoryPaths;
  /** Container engine the session's infrastructure facts should initially observe. */
  readonly requestedEngine?: ContainerEngine;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (isPlainRecord(value)) {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value).toSorted()) {
      const entryValue = value[key];
      if (entryValue !== undefined) {
        sorted[key] = canonicalize(entryValue);
      }
    }
    return sorted;
  }
  return value;
}

/**
 * Serializes a plain data value into a stable string: object keys are sorted, and `undefined`
 * values are dropped, so two structurally equivalent values always produce the same string
 * regardless of property insertion order.
 *
 * @param value - Plain data value to serialize.
 * @returns A canonical JSON string.
 */
function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

/**
 * Derives the stable memoization key of a repository inspection request: the repository root,
 * the inspection profile, and the requested container engine. Two requests with matching keys but
 * different {@link RepositoryPaths} content still count as a conflict.
 *
 * @param request - Repository inspection request to key.
 * @returns A stable string key for `request`.
 */
export function repositoryInspectionRequestKey(request: Readonly<RepositoryInspectionRequest>): string {
  return canonicalJson({
    root: request.paths.root,
    profile: request.profile,
    requestedEngine: request.requestedEngine,
  });
}

/**
 * Checks whether two requests are structurally equivalent (canonical JSON equality).
 *
 * @param left - First request.
 * @param right - Second request.
 * @returns `true` when both requests serialize to the same canonical JSON.
 */
export function equivalentRepositoryInspectionRequests(
  left: Readonly<RepositoryInspectionRequest>,
  right: Readonly<RepositoryInspectionRequest>,
): boolean {
  return canonicalJson(left) === canonicalJson(right);
}

/**
 * Builds the legacy error message for a request whose key is already used by a different request.
 *
 * @param key - The shared {@link repositoryInspectionRequestKey}.
 * @returns The conflicting-request message.
 */
export function repositoryInspectionConflictMessage(key: string): string {
  return `Inspection request for key "${key}" conflicts with an already-created session.`;
}

/** Fixed, redacted reason reported for `"aggregate"` under the quick inspection profile. */
const QUICK_PROFILE_AGGREGATE_REASON = "Aggregate inspection is skipped under the quick inspection profile.";

/**
 * The bounded `"aggregate"` provider used under the quick inspection profile.
 *
 * @remarks
 * It never references the aggregate worker provider, so the isolated aggregate worker process
 * (`aggregate-worker.ts`, which imports the broad `envinfo`/`systeminformation` collectors) can
 * never be spawned while a quick-profile session is in use, even if `"aggregate"` is inspected
 * repeatedly or concurrently. The session stamps its `durationMs`.
 */
const quickAggregateProvider: InspectionProvider<AggregateFacts> = Effect.succeed({
  kind: "unavailable",
  reason: QUICK_PROFILE_AGGREGATE_REASON,
  durationMs: 0,
});

/**
 * Composes every repository inspection provider into one shared, memoized
 * {@link RepositoryInspectionSession}.
 *
 * @remarks
 * Construction is deterministic and free of module-level state: every provider is built fresh for
 * this call over the current services. React, both Svelte projects, and infrastructure resolve
 * their dependency through the composed session, so every dependent fact is memoized by the same
 * cache a direct caller observes, and a targeted {@link InspectionSession.invalidate} only ever
 * forces the exact keys it names to be recomputed. The infrastructure provider reads the current
 * engine (initially `request.requestedEngine`) on each run.
 *
 * @param request - Inspection profile, canonical repository paths, and optional requested engine.
 * @returns A session over every {@link RepositoryInspectionFacts} key, living in the current scope.
 */
export function createRepositoryInspectionSession(
  request: Readonly<RepositoryInspectionRequest>,
): Effect.Effect<RepositoryInspectionSession, never, InspectionRequirements | Scope.Scope> {
  return Effect.gen(function* () {
    const {paths} = request;
    let currentEngine: ContainerEngine | undefined = request.requestedEngine;

    // Assigned below, before any provider can run: providers only run once a caller inspects the returned session.
    let session: RepositoryInspectionSession | undefined;
    const inspect = <K extends RepositoryInspectionKey>(key: K): Effect.Effect<InspectionOutcome<RepositoryInspectionFacts[K]>> =>
      Effect.suspend(() => (session as RepositoryInspectionSession).inspect(key));

    const probes = inspectionProbeRunner;
    const frontendInput: FrontendProviderInput = {paths, packages: inspect("packages"), probes};
    const providers: InspectionProviders<RepositoryInspectionFacts> = {
      workspace: createWorkspaceProvider({root: paths.root}),
      aggregate: request.profile === "quick" ? quickAggregateProvider : createAggregateProvider({root: paths.root}),
      "npm.root": createNpmTreeProvider({scope: "root", root: paths.root, probes}),
      "npm.github-scripts": createNpmTreeProvider({scope: "github-scripts", root: paths.githubScriptsRoot, probes}),
      packages: createInstalledPackageProvider({root: paths.root, packageNames: INSPECTED_PACKAGE_NAMES}),
      dotnet: createDotnetProvider({paths, probes}),
      python: createPythonProvider({paths, probes}),
      react: createReactProvider(frontendInput),
      "svelte.cv": createSvelteProvider("cv", frontendInput),
      "svelte.status": createSvelteProvider("status", frontendInput),
      infrastructure: createInfrastructureProvider({
        paths,
        probes,
        aggregate: inspect("aggregate"),
        resolveEngine: () => currentEngine,
      }),
    };

    const base = yield* createInspectionSession(providers);
    session = {
      ...base,
      updateInfrastructureEngine: (engine) =>
        Effect.sync(() => {
          currentEngine = engine;
        }),
    };
    return session;
  });
}
