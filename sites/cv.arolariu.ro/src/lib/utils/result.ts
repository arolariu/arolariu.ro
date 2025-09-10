/**
 * Unified Result type & helpers for side-effect utilities (Phase 0)
 * Keeps error handling consistent and lightweight without external deps.
 *
 * @format
 */

export type Result<T, E = Error> = {ok: true; value: T} | {ok: false; error: E};

export const ok = <T>(value: T): Result<T> => ({ok: true, value});
export const error = <E = Error>(error: E): Result<never, E> => ({ok: false, error});
