/**
 * @fileoverview Engine-neutral task-scheduling contract and its deterministic, cancellation-aware
 * default implementation.
 * @module scripts/core/runtime/task-scheduler
 *
 * @remarks
 * Every combinator is written with a hand-rolled `Promise` executor instead of `Promise.all` or
 * `Promise.allSettled`, so cancellation, ordering, and concurrency bounds are enforced here.
 */

import {commandCancellationFromSignal, type CommandCancellation} from "./cancellation.ts";

/** Deterministic, cancellation-aware task orchestration used instead of raw `Promise` combinators. */
export interface TaskScheduler {
  /**
   * Runs every task concurrently and resolves with results in input order. Rejects with the
   * first task failure encountered (order of rejection, not order of index) once `signal` aborts.
   */
  readonly parallel: <T>(tasks: readonly (() => Promise<T>)[], signal?: AbortSignal) => Promise<readonly T[]>;
  /** Runs every task concurrently and resolves with every settled outcome in input order. */
  readonly allSettled: <T>(tasks: readonly (() => Promise<T>)[], signal?: AbortSignal) => Promise<readonly PromiseSettledResult<T>[]>;
  /** Runs each task only after the previous one settles, resolving with results in input order. */
  readonly sequential: <T>(tasks: readonly (() => Promise<T>)[], signal?: AbortSignal) => Promise<readonly T[]>;
  /** Maps every value with no more than `concurrency` tasks in flight, preserving input order. */
  readonly mapBounded: <TInput, TOutput>(
    values: readonly TInput[],
    concurrency: number,
    task: (value: TInput, index: number) => Promise<TOutput>,
    signal?: AbortSignal,
  ) => Promise<readonly TOutput[]>;
}

/**
 * Builds a {@link CommandCancellation} when `signal` is defined and already aborted, tolerating
 * an absent signal.
 *
 * @remarks
 * Callers use the returned value (instead of re-checking `signal.aborted` and separately
 * narrowing `signal` to non-`undefined`) as the single source of truth for whether to bail, so no
 * call site needs to prove `signal` is defined by hand.
 *
 * @param signal - Optional cancellation signal.
 * @returns A cancellation error, or `undefined` when `signal` is absent or not aborted.
 */
function cancellationIfAborted(signal?: AbortSignal): CommandCancellation | undefined {
  if (signal === undefined || !signal.aborted) {
    return undefined;
  }
  return commandCancellationFromSignal(signal);
}

/**
 * Runs every task concurrently without ever calling `Promise.all`, resolving with results in
 * input order and rejecting as soon as any task rejects or `signal` aborts.
 *
 * @param tasks - Tasks to start concurrently.
 * @param signal - Optional cancellation signal.
 * @returns Results in the same order as `tasks`.
 */
function runParallel<T>(tasks: readonly (() => Promise<T>)[], signal?: AbortSignal): Promise<readonly T[]> {
  return new Promise<readonly T[]>((resolve, reject) => {
    const cancellation = cancellationIfAborted(signal);
    if (cancellation !== undefined) {
      reject(cancellation);
      return;
    }
    if (tasks.length === 0) {
      resolve([]);
      return;
    }

    const results = new Array<T>(tasks.length);
    let remaining = tasks.length;
    let settled = false;

    const onAbort = (): void => {
      if (settled || signal === undefined) {
        return;
      }
      settled = true;
      signal.removeEventListener("abort", onAbort);
      reject(commandCancellationFromSignal(signal));
    };
    signal?.addEventListener("abort", onAbort, {once: true});

    tasks.forEach((task, index) => {
      task().then(
        (value) => {
          if (settled) {
            return;
          }
          results[index] = value;
          remaining -= 1;
          if (remaining === 0) {
            settled = true;
            signal?.removeEventListener("abort", onAbort);
            resolve(results);
          }
        },
        (error: unknown) => {
          if (settled) {
            return;
          }
          settled = true;
          signal?.removeEventListener("abort", onAbort);
          reject(error);
        },
      );
    });
  });
}

/**
 * Runs every task concurrently without ever calling `Promise.allSettled`, resolving with every
 * settled outcome in input order.
 *
 * @param tasks - Tasks to start concurrently.
 * @param signal - Optional cancellation signal.
 * @returns Settled outcomes in the same order as `tasks`.
 */
function runAllSettled<T>(tasks: readonly (() => Promise<T>)[], signal?: AbortSignal): Promise<readonly PromiseSettledResult<T>[]> {
  return new Promise<readonly PromiseSettledResult<T>[]>((resolve, reject) => {
    const cancellation = cancellationIfAborted(signal);
    if (cancellation !== undefined) {
      reject(cancellation);
      return;
    }
    if (tasks.length === 0) {
      resolve([]);
      return;
    }

    const results = new Array<PromiseSettledResult<T>>(tasks.length);
    let remaining = tasks.length;
    let settled = false;

    const onAbort = (): void => {
      if (settled || signal === undefined) {
        return;
      }
      settled = true;
      signal.removeEventListener("abort", onAbort);
      reject(commandCancellationFromSignal(signal));
    };
    signal?.addEventListener("abort", onAbort, {once: true});

    const settleOneAndMaybeResolve = (): void => {
      remaining -= 1;
      if (remaining === 0 && !settled) {
        settled = true;
        signal?.removeEventListener("abort", onAbort);
        resolve(results);
      }
    };

    tasks.forEach((task, index) => {
      task().then(
        (value) => {
          if (settled) {
            return;
          }
          results[index] = {status: "fulfilled", value};
          settleOneAndMaybeResolve();
        },
        (reason: unknown) => {
          if (settled) {
            return;
          }
          results[index] = {status: "rejected", reason};
          settleOneAndMaybeResolve();
        },
      );
    });
  });
}

/**
 * Runs each task only after the previous one settles, resolving with results in input order.
 *
 * @param tasks - Tasks to run one after another.
 * @param signal - Optional cancellation signal, re-checked before starting each task.
 * @returns Results in the same order as `tasks`.
 */
async function runSequential<T>(tasks: readonly (() => Promise<T>)[], signal?: AbortSignal): Promise<readonly T[]> {
  const initialCancellation = cancellationIfAborted(signal);
  if (initialCancellation !== undefined) {
    throw initialCancellation;
  }

  const results: T[] = [];
  for (const task of tasks) {
    const cancellation = cancellationIfAborted(signal);
    if (cancellation !== undefined) {
      throw cancellation;
    }
    // Intentionally sequential: each task must observe every earlier task's completed effects.
    // eslint-disable-next-line no-await-in-loop
    results.push(await task());
  }
  return results;
}

/**
 * Maps every value with no more than `concurrency` tasks in flight at once, starting the next
 * queued value as soon as a slot frees, and resolving with outputs in input order.
 *
 * @param values - Values to map.
 * @param concurrency - Maximum number of tasks allowed to run at once; must be a positive integer.
 * @param task - Mapping task invoked once per value.
 * @param signal - Optional cancellation signal.
 * @returns Outputs in the same order as `values`.
 */
function runMapBounded<TInput, TOutput>(
  values: readonly TInput[],
  concurrency: number,
  task: (value: TInput, index: number) => Promise<TOutput>,
  signal?: AbortSignal,
): Promise<readonly TOutput[]> {
  return new Promise<readonly TOutput[]>((resolve, reject) => {
    if (!Number.isInteger(concurrency) || concurrency < 1) {
      reject(new RangeError(`concurrency must be a positive integer, received ${concurrency}.`));
      return;
    }
    const cancellation = cancellationIfAborted(signal);
    if (cancellation !== undefined) {
      reject(cancellation);
      return;
    }
    if (values.length === 0) {
      resolve([]);
      return;
    }

    const results = new Array<TOutput>(values.length);
    const iterator = values.entries();
    let remaining = values.length;
    let settled = false;

    const onAbort = (): void => {
      if (settled || signal === undefined) {
        return;
      }
      settled = true;
      signal.removeEventListener("abort", onAbort);
      reject(commandCancellationFromSignal(signal));
    };
    signal?.addEventListener("abort", onAbort, {once: true});

    const startNext = (): void => {
      if (settled) {
        return;
      }
      const next = iterator.next();
      if (next.done === true) {
        return;
      }
      const [index, value] = next.value;
      task(value, index).then(
        (output) => {
          if (settled) {
            return;
          }
          results[index] = output;
          remaining -= 1;
          if (remaining === 0) {
            settled = true;
            signal?.removeEventListener("abort", onAbort);
            resolve(results);
            return;
          }
          startNext();
        },
        (error: unknown) => {
          if (settled) {
            return;
          }
          settled = true;
          signal?.removeEventListener("abort", onAbort);
          reject(error);
        },
      );
    };

    const initialWorkerCount = Math.min(concurrency, values.length);
    for (let worker = 0; worker < initialWorkerCount; worker += 1) {
      startNext();
    }
  });
}

/**
 * Default {@link TaskScheduler}: deterministic, cancellation-aware task orchestration implemented
 * with hand-written `Promise` executors, never `Promise.all`/`Promise.allSettled`.
 */
export class DefaultTaskScheduler implements TaskScheduler {
  /** {@inheritDoc TaskScheduler.parallel} */
  public parallel<T>(tasks: readonly (() => Promise<T>)[], signal?: AbortSignal): Promise<readonly T[]> {
    return runParallel(tasks, signal);
  }
  /** {@inheritDoc TaskScheduler.allSettled} */
  public allSettled<T>(tasks: readonly (() => Promise<T>)[], signal?: AbortSignal): Promise<readonly PromiseSettledResult<T>[]> {
    return runAllSettled(tasks, signal);
  }
  /** {@inheritDoc TaskScheduler.sequential} */
  public sequential<T>(tasks: readonly (() => Promise<T>)[], signal?: AbortSignal): Promise<readonly T[]> {
    return runSequential(tasks, signal);
  }
  /** {@inheritDoc TaskScheduler.mapBounded} */
  public mapBounded<TInput, TOutput>(
    values: readonly TInput[],
    concurrency: number,
    task: (value: TInput, index: number) => Promise<TOutput>,
    signal?: AbortSignal,
  ): Promise<readonly TOutput[]> {
    return runMapBounded(values, concurrency, task, signal);
  }
}
