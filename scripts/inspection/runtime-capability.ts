/**
 * @fileoverview The repository-inspection composition seam: the request contract, its memoized
 * registry, and the extended execution context Doctor, Setup, and Status compose onto their base
 * runtime scope.
 * @module scripts/inspection/runtime-capability
 *
 * @remarks
 * Repository inspection is owned here rather than by the core runtime: it is a repository-specific
 * capability, not an engine primitive, so no module under `scripts/core/` may name it. A command
 * declares the extension through `createRuntimeContext`, which resolves an explicit test override
 * first, then the parent scope's registry, then a production registry bound to its own scope.
 */

import type {ContainerEngine} from "../container-runtime/types.ts";
import type {RepositoryPaths} from "../common/repository-paths.ts";
import type {CommandExecutionContext} from "../core/command/command-execution.ts";
import {asReadOnlyFileSystem, type TemporaryDirectory} from "../core/runtime/runtime-capability.ts";
import type {RuntimeExecutionContext} from "../core/runtime/runtime-execution-context.ts";
import {createRepositoryInspectionSession, type RepositoryInspectionSession} from "./repository.ts";

/** Selects how thoroughly a repository inspection session inspects the repository. */
export interface RepositoryInspectionRequest {
  /** Inspection thoroughness profile. */
  readonly profile: "full" | "quick";
  /** Canonical repository paths the session inspects. */
  readonly paths: RepositoryPaths;
  /** Container engine the session's infrastructure facts should initially observe. */
  readonly requestedEngine?: ContainerEngine;
}

/** Shares one memoized {@link RepositoryInspectionSession} across every command that requests it. */
export interface RepositoryInspectionRuntime {
  /**
   * Returns the shared session for `request`, creating it on first use. A later call with an
   * equivalent request returns the exact same session instance instead of creating a new one.
   */
  readonly getRepositorySession: (request: Readonly<RepositoryInspectionRequest>) => RepositoryInspectionSession;
}

/** One command scope that additionally carries the shared repository-inspection registry. */
export type InspectionRuntimeExecutionContext = RuntimeExecutionContext
  & Readonly<{
    /** Shared, memoized repository inspection capability. */
    readonly inspection: RepositoryInspectionRuntime;
  }>;

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
 * Serializes a plain data value into a stable string: object keys are sorted and `undefined`
 * values are dropped, so two structurally equivalent values always produce the same string.
 *
 * @param value - Plain data value to serialize.
 * @returns A canonical JSON string.
 */
function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

interface MemoizedSessionEntry<TRequest, TSession> {
  readonly request: Readonly<TRequest>;
  readonly session: TSession;
}

/**
 * Shares one session per distinct request key, and rejects a second request that maps to an
 * already-used key but is not structurally equivalent to the request that created that session,
 * instead of silently returning a session built for different inputs.
 */
export class MemoizedInspectionRuntime<TRequest extends object, TSession> {
  readonly #createSession: (request: Readonly<TRequest>) => TSession;
  readonly #keyOf: (request: Readonly<TRequest>) => string;
  readonly #sessions = new Map<string, MemoizedSessionEntry<TRequest, TSession>>();
  /**
   * Creates a memoized session runtime.
   *
   * @param createSession - Builds a new session for a request that has not been seen before.
   * @param keyOf - Derives the memoization key; defaults to a canonical serialization of `request`.
   */
  public constructor(
    createSession: (request: Readonly<TRequest>) => TSession,
    keyOf: (request: Readonly<TRequest>) => string = (request) => canonicalJson(request),
  ) {
    this.#createSession = createSession;
    this.#keyOf = keyOf;
  }
  /**
   * Returns the shared session for `request`, creating it on first use.
   *
   * @param request - Request describing the session to share.
   * @returns The session created for the first equivalent request.
   * @throws When `request` maps to an already-used key but is not structurally equivalent to the
   * request that created that key's session.
   */
  public getRepositorySession(request: Readonly<TRequest>): TSession {
    const key = this.#keyOf(request);
    const existing = this.#sessions.get(key);
    if (existing !== undefined) {
      if (canonicalJson(existing.request) !== canonicalJson(request)) {
        throw new Error(`Inspection request for key "${key}" conflicts with an already-created session.`);
      }
      return existing.session;
    }
    const session = this.#createSession(request);
    this.#sessions.set(key, {request, session});
    return session;
  }
}

/**
 * Derives the stable memoization key {@link createRepositoryInspectionRuntime} uses: the
 * repository root, the inspection profile, and the requested container engine. Two requests with
 * matching keys but different {@link RepositoryPaths} content still count as a conflict.
 *
 * @param request - Repository inspection request to key.
 * @returns A stable string key for `request`.
 */
export function repositoryInspectionRequestKey(request: Readonly<RepositoryInspectionRequest>): string {
  return canonicalJson({root: request.paths.root, profile: request.profile, requestedEngine: request.requestedEngine});
}

/**
 * Builds the shared, memoized {@link RepositoryInspectionRuntime} an extended execution context
 * exposes, so every command that requests a session for the same root, profile, and requested
 * engine observes the exact same {@link RepositoryInspectionSession} instance.
 *
 * @param createSession - Builds a new session for a request that has not been seen before.
 * @returns A repository inspection runtime backed by one {@link MemoizedInspectionRuntime}.
 */
export function createRepositoryInspectionRuntime(
  createSession: (request: Readonly<RepositoryInspectionRequest>) => RepositoryInspectionSession,
): RepositoryInspectionRuntime {
  const memoized = new MemoizedInspectionRuntime<RepositoryInspectionRequest, RepositoryInspectionSession>(
    createSession,
    repositoryInspectionRequestKey,
  );
  return {
    getRepositorySession: (request: Readonly<RepositoryInspectionRequest>): RepositoryInspectionSession =>
      memoized.getRepositorySession(request),
  };
}

/**
 * Reports whether one execution context already carries the shared repository-inspection registry.
 *
 * @param runtime - Base execution context to inspect; an extended context is structurally
 * assignable to it, so a caller never needs a cast to ask this question.
 * @returns `true` when `runtime` carries a usable registry.
 */
export function hasInspectionRuntimeCapability(runtime: RuntimeExecutionContext): runtime is InspectionRuntimeExecutionContext {
  if (!("inspection" in runtime)) {
    return false;
  }
  const {inspection} = runtime;
  return (
    typeof inspection === "object"
    && inspection !== null
    && "getRepositorySession" in inspection
    && typeof inspection.getRepositorySession === "function"
  );
}

/**
 * Builds the production registry for one scope, binding every session it creates to that scope's
 * own runner, filesystem, clock, scheduler, environment, and cancellation signal. The registry is
 * lazy: no session — and therefore no probe, worker, or filesystem read — exists until a command
 * actually requests one.
 *
 * @param runtime - The scope whose capabilities every created session observes.
 * @returns The memoized repository inspection runtime for that scope.
 */
function createScopedRepositoryInspectionRuntime(runtime: RuntimeExecutionContext): RepositoryInspectionRuntime {
  const {runner, files, clock, tasks, environment, signal} = runtime;
  return createRepositoryInspectionRuntime((request: Readonly<RepositoryInspectionRequest>): RepositoryInspectionSession =>
    createRepositoryInspectionSession({
      ...request,
      runner,
      files: asReadOnlyFileSystem(files),
      temporaryDirectories: {
        createTemporaryDirectory: (prefix: string): Promise<TemporaryDirectory> => files.createTemporaryDirectory(prefix),
      },
      clock,
      tasks,
      environment,
      signal,
    }),
  );
}

/**
 * Extends one base execution context with the shared repository-inspection registry.
 *
 * @remarks
 * Resolution order is exactly: the explicit `inspectionOverride` (the test-injection seam), then
 * the parent scope's registry when the parent already carries one, then a newly created production
 * registry bound to this scope. Because `parent` is typed as the *base* execution context, an
 * extended parent stays structurally assignable and the lifecycle passes it through unchanged.
 *
 * @param baseRuntime - The scope the command lifecycle created for this invocation.
 * @param parent - Owning parent context of a composed child invocation, when there is one.
 * @param inspectionOverride - Explicitly injected registry that wins over every other source.
 * @returns The extended execution context carrying the resolved registry.
 */
export function createInspectionRuntimeExecutionContext(
  baseRuntime: RuntimeExecutionContext,
  parent?: Readonly<CommandExecutionContext<RuntimeExecutionContext>>,
  inspectionOverride?: RepositoryInspectionRuntime,
): InspectionRuntimeExecutionContext {
  if (inspectionOverride !== undefined) {
    return {...baseRuntime, inspection: inspectionOverride};
  }
  const parentRuntime = parent?.runtime;
  if (parentRuntime !== undefined && hasInspectionRuntimeCapability(parentRuntime)) {
    return {...baseRuntime, inspection: parentRuntime.inspection};
  }
  return {...baseRuntime, inspection: createScopedRepositoryInspectionRuntime(baseRuntime)};
}
