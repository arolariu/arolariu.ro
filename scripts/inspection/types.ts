/**
 * @fileoverview Public outcome and provider contracts for process-local inspection sessions.
 * @module scripts/inspection/types
 *
 * @remarks
 * Every import here is type-only, so this module never pulls the runtime kernel (or, transitively,
 * the Node adapter) into an inspection provider's module graph at run time.
 */

import type {ProcessRunner} from "../common/runner.ts";
import type {Clock, FileSystem, ReadOnlyFileSystem, RuntimeEnvironment, TaskScheduler} from "../common/runtime.ts";

/**
 * The exact capability surface an inspection provider is allowed to observe.
 *
 * @remarks
 * Providers never read ambient state: they receive this context (or a narrower `Pick` of it) from
 * the composed repository session, which itself receives the capabilities from one
 * {@link CommandRuntime}. The ordinary filesystem is deliberately read-only; the single writable
 * capability is {@link InspectionProviderContext.temporaryDirectories}, which can only create a
 * caller-owned temporary directory outside the repository.
 */
export interface InspectionProviderContext {
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
  /** Cancellation signal of the owning command invocation. */
  readonly signal: AbortSignal;
}

/**
 * Result of one inspection attempt for a single fact of type `T`.
 *
 * Exactly one of three disjoint variants, discriminated by `kind`:
 * - `"available"`: the fact was observed and resolved to `value`.
 * - `"unavailable"`: the fact could not be observed; `reason` explains why.
 * - `"invalid"`: the fact was observed but failed validation; `issues` lists each failure.
 *
 * Every variant carries `durationMs`, the wall-clock time the inspection took to produce this
 * outcome. A rejected provider (a thrown or asynchronously rejected error) is never represented
 * as an `InspectionOutcome`; it is an exceptional condition surfaced as a rejected promise instead.
 */
export type InspectionOutcome<T> =
  | {readonly kind: "available"; readonly value: T; readonly durationMs: number}
  | {readonly kind: "unavailable"; readonly reason: string; readonly durationMs: number}
  | {readonly kind: "invalid"; readonly issues: readonly string[]; readonly durationMs: number};

/** Produces one {@link InspectionOutcome} for a single fact. Rejection/throw is exceptional, not a `kind`. */
export type InspectionProvider<T> = () => Promise<InspectionOutcome<T>>;

/** One {@link InspectionProvider} per key of a fixed fact shape `TFacts`. */
export type InspectionProviders<TFacts extends object> = {
  readonly [Key in keyof TFacts]: InspectionProvider<TFacts[Key]>;
};

/** A process-local, memoized inspection session over one fixed {@link InspectionProviders} map. */
export interface InspectionSession<TFacts extends object> {
  /**
   * Resolves the memoized {@link InspectionOutcome} for `key`, invoking the underlying provider
   * only when no cached or in-flight result exists for that key.
   *
   * @param key - Fact key to inspect.
   * @returns A promise for the memoized outcome; rejects (and evicts its own cache entry) if the
   * underlying provider rejects or throws synchronously.
   */
  readonly inspect: <Key extends keyof TFacts>(key: Key) => Promise<InspectionOutcome<TFacts[Key]>>;

  /**
   * Removes any cached or in-flight result for exactly the supplied keys, forcing the next
   * {@link InspectionSession.inspect} call for each to invoke its provider again.
   *
   * @param keys - Fact keys to forget. Keys not supplied are left untouched.
   */
  readonly invalidate: (...keys: readonly (keyof TFacts)[]) => void;
}
