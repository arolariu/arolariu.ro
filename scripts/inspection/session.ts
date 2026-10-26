/**
 * @fileoverview Process-local memoized inspection session over one fixed provider map.
 * @module scripts/inspection/session
 */

import {Clock, Context, Deferred, Effect, Exit, Scope} from "effect";

import type {InspectionOutcome, InspectionProviders, InspectionRequirements, InspectionSession} from "./types.ts";

/**
 * Stamps an outcome with the elapsed `Clock.currentTimeMillis` of the effect producing it.
 *
 * @remarks
 * Providers build every outcome with a placeholder `durationMs` and wrap their body in this
 * function, so the duration always spans the whole observation, including its final projection.
 * A non-finite or negative elapsed time is reported as `0`.
 *
 * @param body - The effect producing the outcome.
 * @returns The same outcome with `durationMs` set to the elapsed time.
 */
export function timed<T, E, R>(body: Effect.Effect<InspectionOutcome<T>, E, R>): Effect.Effect<InspectionOutcome<T>, E, R> {
  return Effect.gen(function* () {
    const startedAt = yield* Clock.currentTimeMillis;
    const outcome = yield* body;
    const elapsed = (yield* Clock.currentTimeMillis) - startedAt;
    return {...outcome, durationMs: Number.isFinite(elapsed) ? Math.max(0, elapsed) : 0};
  });
}

/**
 * Creates a process-local {@link InspectionSession} that memoizes each provider's outcome by key.
 *
 * @remarks
 * The current context (the {@link InspectionRequirements} services and the session scope) is
 * captured once, so the returned `inspect` and `invalidate` require nothing.
 *
 * Memoization is backed by one heterogeneous `Map<keyof TFacts, Deferred<InspectionOutcome<unknown>>>`:
 * a single `Map` cannot carry a distinct value type per key, so each entry's payload type is erased
 * to `InspectionOutcome<unknown>`, and one narrow cast restores `InspectionOutcome<TFacts[Key]>` for
 * the key being read. That is safe only because `inspect` is the sole writer of a key's entry, and
 * every write for `key` is completed by `providers[key]`.
 *
 * The first `inspect(key)` registers its `Deferred` and forks the provider into the session scope in
 * one uninterruptible step, so concurrent callers await the same `Deferred` and the provider runs
 * once; interrupting a waiter never interrupts the shared provider, which is interrupted only when
 * the session scope closes. Each provider run gets its own scope and an `inspection.<key>` span, and its `durationMs` is the
 * elapsed `Clock.currentTimeMillis` of that run. A provider defect (or interruption) is delivered to
 * every waiter and evicts its own entry, so a later `inspect` retries; `invalidate` removes the
 * entries for its keys, and an in-flight run still completes its `Deferred` for the callers
 * already waiting but is never re-cached.
 *
 * @param providers - Fixed map of one {@link InspectionProvider} per fact key.
 * @returns A session exposing memoized `inspect` and key-scoped `invalidate`.
 */
export function createInspectionSession<TFacts extends object>(
  providers: InspectionProviders<TFacts>,
): Effect.Effect<InspectionSession<TFacts>, never, InspectionRequirements | Scope.Scope> {
  return Effect.gen(function* () {
    const context = yield* Effect.context<InspectionRequirements | Scope.Scope>();
    const scope = Context.get(context, Scope.Scope);
    const cache = new Map<keyof TFacts, Deferred.Deferred<InspectionOutcome<unknown>>>();

    const measured = <Key extends keyof TFacts>(key: Key): Effect.Effect<InspectionOutcome<TFacts[Key]>> =>
      timed(Effect.scoped(providers[key])).pipe(Effect.withSpan(`inspection.${String(key)}`), Effect.provideContext(context));

    const inspect = <Key extends keyof TFacts>(key: Key): Effect.Effect<InspectionOutcome<TFacts[Key]>> =>
      Effect.uninterruptibleMask((restore) =>
        Effect.suspend(() => {
          const cached = cache.get(key);
          if (cached !== undefined) {
            return restore(Deferred.await(cached) as Effect.Effect<InspectionOutcome<TFacts[Key]>>);
          }

          const deferred = Deferred.makeUnsafe<InspectionOutcome<unknown>>();
          cache.set(key, deferred);
          const run = Effect.interruptible(measured(key)).pipe(
            Effect.onExit((exit) =>
              Effect.suspend(() => {
                if (Exit.isFailure(exit) && cache.get(key) === deferred) {
                  cache.delete(key);
                }
                return Deferred.done(deferred, exit);
              }),
            ),
          );
          return Effect.forkIn(run, scope).pipe(
            Effect.andThen(restore(Deferred.await(deferred) as Effect.Effect<InspectionOutcome<TFacts[Key]>>)),
          );
        }),
      );

    const invalidate = (...keys: readonly (keyof TFacts)[]): Effect.Effect<void> =>
      Effect.sync(() => {
        for (const key of keys) {
          cache.delete(key);
        }
      });

    return {inspect, invalidate};
  });
}
