/**
 * @fileoverview Public outcome, provider, and session contracts for process-local inspection sessions.
 * @module scripts/inspection/types
 *
 * @remarks
 * Every import here is type-only. A provider is an Effect that requires only the read-only
 * {@link InspectionRequirements} services (plus a scope for its own resources).
 */

import type {Effect, Scope} from "effect";

import type {Environment} from "../platform/Environment.ts";
import type {ReadOnlyFiles, TemporaryDirectories} from "../platform/Files.ts";
import type {Process} from "../platform/Process.ts";

/**
 * Result of one inspection attempt for a single fact of type `T`.
 *
 * Exactly one of three disjoint variants, discriminated by `kind`:
 * - `"available"`: the fact was observed and resolved to `value`.
 * - `"unavailable"`: the fact could not be observed; `reason` explains why.
 * - `"invalid"`: the fact was observed but failed validation; `issues` lists each failure.
 *
 * Every variant carries `durationMs`, the wall-clock time the inspection took to produce this
 * outcome. A provider defect is never represented as an `InspectionOutcome`; it is an exceptional
 * condition surfaced as a defect instead.
 */
export type InspectionOutcome<T> =
  | {readonly kind: "available"; readonly value: T; readonly durationMs: number}
  | {readonly kind: "unavailable"; readonly reason: string; readonly durationMs: number}
  | {readonly kind: "invalid"; readonly issues: readonly string[]; readonly durationMs: number};

/**
 * The exact service surface an inspection provider may observe: the read-only filesystem, the
 * single writable temporary-directory capability, child processes, and the environment snapshot.
 */
export type InspectionRequirements = ReadOnlyFiles | TemporaryDirectories | Process | Environment;

/** Produces one {@link InspectionOutcome} for a single fact. A defect is exceptional, not a `kind`. */
export type InspectionProvider<T> = Effect.Effect<InspectionOutcome<T>, never, InspectionRequirements | Scope.Scope>;

/** One {@link InspectionProvider} per key of a fixed fact shape `TFacts`. */
export type InspectionProviders<TFacts extends object> = {
  readonly [Key in keyof TFacts]: InspectionProvider<TFacts[Key]>;
};

/** A process-local, memoized inspection session over one fixed {@link InspectionProviders} map. */
export interface InspectionSession<TFacts extends object> {
  /**
   * Resolves the memoized {@link InspectionOutcome} for `key`, running the underlying provider
   * only when no cached or in-flight result exists for that key.
   *
   * @param key - Fact key to inspect.
   * @returns The memoized outcome; dies (and evicts its own cache entry) when the provider dies.
   */
  readonly inspect: <Key extends keyof TFacts>(key: Key) => Effect.Effect<InspectionOutcome<TFacts[Key]>>;

  /**
   * Removes any cached or in-flight result for exactly the supplied keys, forcing the next
   * {@link InspectionSession.inspect} call for each to run its provider again. An in-flight
   * provider still delivers its result to the callers already waiting for it.
   *
   * @param keys - Fact keys to forget. Keys not supplied are left untouched.
   */
  readonly invalidate: (...keys: readonly (keyof TFacts)[]) => Effect.Effect<void>;
}
