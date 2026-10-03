/**
 * @fileoverview Vitest helpers for running Effect programs in scripts test suites.
 * @module scripts/platform/testing
 *
 * @remarks
 * The repository stays on Vitest 4 (required by `@storybook/addon-vitest`), so `@effect/vitest` is
 * not available. These helpers fill that gap: {@link runScoped} runs an effect inside a fresh scope
 * with a test layer provided and surfaces typed failures as the original error value, and
 * {@link effectTest} registers a Vitest case whose body is an effect.
 */

import {Cause, Effect, Exit, type Layer, type Scope} from "effect";
import {it} from "vitest";

/**
 * Runs an effect inside a fresh scope with the given layer provided.
 *
 * @param effect - The effect under test; it may require a {@link Scope.Scope} and the services of `layer`.
 * @param layer - The layer that provides every service the effect requires.
 * @returns A promise that resolves with the effect value after all scope finalizers have run.
 * @throws The squashed failure cause (`Cause.squash`), so a typed failure rejects with the original
 * error value and Vitest prints the real error.
 */
export async function runScoped<A, E, R>(effect: Effect.Effect<A, E, R | Scope.Scope>, layer: Layer.Layer<R>): Promise<A> {
  const exit = await Effect.runPromiseExit(effect.pipe(Effect.scoped, Effect.provide(layer)));
  if (Exit.isSuccess(exit)) {
    return exit.value;
  }
  throw Cause.squash(exit.cause);
}

/**
 * Registers a Vitest case whose body is an effect run through {@link runScoped}.
 *
 * @param name - The test name.
 * @param body - Builds the effect to run; it may require a {@link Scope.Scope} and the services of `layer`.
 * @param layer - The layer that provides every service the body requires.
 * @param timeoutMs - Optional per-test timeout in milliseconds; defaults to the Vitest configuration.
 */
export function effectTest<E, R>(
  name: string,
  body: () => Effect.Effect<void, E, R | Scope.Scope>,
  layer: Layer.Layer<R>,
  timeoutMs?: number,
): void {
  it(name, () => runScoped(body(), layer), timeoutMs);
}
