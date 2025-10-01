/**
 * Unified Result type & helpers for side-effect utilities (Phase 0)
 * Keeps error handling consistent and lightweight without external deps.
 *
 * @format
 */

export type Result<T, E = Error> = Readonly<{ok: true; value: T} | {ok: false; error: E}>;
export const ok = <T>(value?: T): Readonly<Result<T>> => ({ok: true, value: value as T});
export const error = <E = Error>(error_: E): Readonly<Result<never, E>> => ({ok: false, error: error_});
