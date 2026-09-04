/**
 * @fileoverview Engine-neutral runtime capability kernel: the typed contracts and pure,
 * environment-independent primitives every command depends on.
 * @module scripts/common/runtime
 *
 * @remarks
 * This module defines *what* a command needs (environment, clock, task scheduling, cleanup,
 * filesystem, HTTP, and repository inspection) without ever touching Node's filesystem, network,
 * process, timer, or OS APIs itself. Concrete engine-backed implementations (the ones that do
 * call into `node:fs`, `node:http`, `setTimeout`, `process.*`, and so on) live in the Node adapter
 * module and are injected into commands as one {@link CommandRuntime}. Keeping this file free of
 * ambient state and Node imports lets every contract here be exercised with plain fakes in tests,
 * and lets the Node adapter be the single, auditable boundary where real I/O happens.
 */

import type {TerminalPresenter} from "../core/presentation/terminal-presenter.ts";
import type {PromptProvider} from "./prompts.ts";
import type {RepositoryPaths} from "./repository-paths.ts";
import type {ProcessRunner} from "../core/process/process-runner.ts";
import type {ContainerEngine} from "../container-runtime/types.ts";
import type {RepositoryInspectionSession} from "../inspection/repository.ts";

/** Immutable snapshot of the ambient environment a command observes. */
export interface RuntimeEnvironment {
  /** Environment variable values, read-only and never mutated by a command. */
  readonly variables: Readonly<Record<string, string | undefined>>;
  /** Working directory the command was launched from. */
  readonly cwd: string;
  /** Absolute path to the executable running the command. */
  readonly executablePath: string;
  /** Host operating-system platform identifier. */
  readonly platform: NodeJS.Platform;
  /** Host CPU architecture identifier. */
  readonly architecture: string;
  /** Whether standard input is attached to an interactive terminal. */
  readonly stdinIsTTY: boolean;
  /** Whether standard output is attached to an interactive terminal. */
  readonly stdoutIsTTY: boolean;
  /** Whether the command is running inside a continuous-integration environment. */
  readonly isCI: boolean;
}

/** Engine-neutral source of monotonic time, wall-clock timestamps, and cancellable delay. */
export interface Clock {
  /** Monotonically increasing time in milliseconds, suitable only for measuring durations. */
  readonly monotonicNow: () => number;
  /** Current wall-clock time formatted as an ISO-8601 timestamp. */
  readonly isoTimestamp: () => string;
  /** Resolves after the given duration, or rejects immediately once `signal` aborts. */
  readonly delay: (milliseconds: number, signal?: AbortSignal) => Promise<void>;
}

/** Deterministic, cancellation-aware task orchestration used instead of raw `Promise` combinators. */
export interface TaskScheduler {
  /**
   * Runs every task concurrently and resolves with results in input order. Rejects with the
   * first task failure encountered (order of rejection, not order of index) once `signal` aborts.
   */
  readonly parallel: <T>(tasks: readonly (() => Promise<T>)[], signal?: AbortSignal) => Promise<readonly T[]>;
  /** Runs every task concurrently and resolves with every settled outcome in input order. */
  readonly allSettled: <T>(
    tasks: readonly (() => Promise<T>)[],
    signal?: AbortSignal,
  ) => Promise<readonly PromiseSettledResult<T>[]>;
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

/** One cleanup callback that failed during {@link CleanupRegistry.drain}. */
export interface CleanupFailure {
  /** Label supplied when the failing cleanup was registered. */
  readonly label: string;
  /** Human-readable failure message. */
  readonly message: string;
  /** Original thrown or rejected value. */
  readonly cause: unknown;
}

/** Ordered registry of teardown callbacks a command must run before exiting. */
export interface CleanupRegistry {
  /**
   * Registers one labeled cleanup callback.
   *
   * @returns A function that unregisters this callback so it is skipped by a later
   * {@link CleanupRegistry.drain}, without affecting any other registered callback.
   */
  readonly register: (label: string, cleanup: () => void | Promise<void>) => () => void;
  /**
   * Runs every still-registered cleanup callback in last-registered-first-run (LIFO) order,
   * removing each callback from the registry as it runs, and collects every failure instead of
   * stopping at the first one.
   */
  readonly drain: () => Promise<readonly CleanupFailure[]>;
}

/** Classifies what a filesystem path currently is. */
export type FileKind = "file" | "directory" | "missing" | "other";

/** Metadata describing one filesystem entry. */
export interface FileMetadata {
  /** What kind of entry this path currently is. */
  readonly kind: FileKind;
  /** Size in bytes, `0` when the entry is missing or has no size. */
  readonly size: number;
  /** POSIX-style permission bits, when available on the host platform. */
  readonly mode?: number;
  /** Last-modified timestamp, when available. */
  readonly modifiedAt?: Date;
}

/** One entry returned by {@link ReadOnlyFileSystem.readDirectory}. */
export interface DirectoryEntry {
  /** Entry name, relative to the directory that was read. */
  readonly name: string;
  /** Kind of this entry; directories are never reported as `"missing"`. */
  readonly kind: Exclude<FileKind, "missing">;
}

/** Handle to one caller-owned temporary directory. */
export interface TemporaryDirectory {
  /** Absolute path to the created directory. */
  readonly path: string;
  /**
   * Removes exactly the directory represented by this handle (recursively), and nothing else,
   * even if the directory has since been renamed or another temporary directory shares a prefix.
   */
  readonly remove: () => Promise<void>;
}

/** Read-only filesystem operations safe to hand to code that must never mutate disk state. */
export interface ReadOnlyFileSystem {
  /** Reads one file's entire contents as UTF-8 text. */
  readonly readText: (path: string) => Promise<string>;
  /**
   * Reads one file's entire contents as raw bytes.
   *
   * @remarks
   * When `options.maximumBytes` is set, the implementation reads at most `maximumBytes + 1`
   * bytes and throws a {@link FileSystemError} with code {@link FILE_SYSTEM_MAX_BYTES_EXCEEDED_CODE}
   * once it observes the file is larger, instead of first stat-ing the file (a check that can
   * race a concurrent write) or allocating an unbounded buffer.
   */
  readonly readBytes: (path: string, options?: Readonly<{maximumBytes?: number}>) => Promise<Uint8Array>;
  /** Reports whether a path currently exists, without distinguishing why it might not. */
  readonly exists: (path: string) => Promise<boolean>;
  /**
   * Throws a code-preserving {@link FileSystemError} unless every requested access mode is
   * currently permitted for `path`.
   */
  readonly assertAccessible: (
    path: string,
    access?: Readonly<{read?: boolean; write?: boolean; execute?: boolean}>,
  ) => Promise<void>;
  /** Resolves symlinks and relative segments, preserving the platform error code on failure. */
  readonly realPath: (path: string) => Promise<string>;
  /** Reports the kind, size, mode, and modification time of one path. */
  readonly inspect: (path: string) => Promise<FileMetadata>;
  /** Lists the immediate entries of one directory. */
  readonly readDirectory: (path: string) => Promise<readonly DirectoryEntry[]>;
  /** Resolves one or more glob patterns to matching paths. */
  readonly glob: (
    patterns: string | readonly string[],
    options?: Readonly<{cwd?: string; onlyFiles?: boolean}>,
  ) => Promise<readonly string[]>;
}

/** Full filesystem capability, including every mutating operation. */
export interface FileSystem extends ReadOnlyFileSystem {
  /** Creates one directory, optionally creating missing parents. */
  readonly createDirectory: (path: string, options?: Readonly<{recursive?: boolean; mode?: number}>) => Promise<void>;
  /** Writes UTF-8 text to one file, replacing its contents. */
  readonly writeText: (
    path: string,
    contents: string,
    options?: Readonly<{mode?: number; exclusive?: boolean}>,
  ) => Promise<void>;
  /** Writes raw bytes to one file, replacing its contents. */
  readonly writeBytes: (
    path: string,
    contents: Uint8Array,
    options?: Readonly<{mode?: number; exclusive?: boolean}>,
  ) => Promise<void>;
  /** Writes UTF-8 text so readers never observe a partially written file. */
  readonly writeTextAtomic: (
    path: string,
    contents: string,
    options?: Readonly<{mode?: number; directoryMode?: number}>,
  ) => Promise<void>;
  /** Copies one file or directory tree to a new path. */
  readonly copy: (source: string, destination: string, options?: Readonly<{recursive?: boolean; force?: boolean}>) => Promise<void>;
  /** Moves or renames one path. */
  readonly move: (source: string, destination: string) => Promise<void>;
  /** Removes one file or directory tree. */
  readonly remove: (path: string, options?: Readonly<{recursive?: boolean; force?: boolean}>) => Promise<void>;
  /** Creates one uniquely named temporary directory under the platform temporary root. */
  readonly createTemporaryDirectory: (prefix: string) => Promise<TemporaryDirectory>;
  /** Sets one path's POSIX-style permission bits. */
  readonly setMode: (path: string, mode: number) => Promise<void>;
}

/** One HTTP request description. */
export interface HttpRequest {
  /** Absolute request URL. */
  readonly url: URL;
  /** HTTP method; defaults to `"GET"` when omitted. */
  readonly method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** Request headers. */
  readonly headers?: Readonly<Record<string, string>>;
  /** Request body. */
  readonly body?: string | Uint8Array;
  /** Overall request timeout in milliseconds. */
  readonly timeoutMs?: number;
  /** Optional cancellation signal. */
  readonly signal?: AbortSignal;
  /** Maximum number of response bytes to buffer before failing the request. */
  readonly maximumResponseBytes?: number;
  /** Optional retry policy applied to matching response statuses. */
  readonly retry?: Readonly<{attempts: number; delayMs: number; statuses: readonly number[]}>;
}

/** One completed HTTP response. */
export interface HttpResponse {
  /** HTTP status code. */
  readonly status: number;
  /** Whether `status` is in the `200`-`299` range. */
  readonly ok: boolean;
  /** Response headers. */
  readonly headers: Readonly<Record<string, string>>;
  /** Raw response body bytes. */
  readonly bytes: Uint8Array;
  /** Response body decoded as UTF-8 text. */
  readonly text: string;
}

/** Full HTTP capability. */
export interface HttpClient {
  /** Sends one HTTP request and resolves with its response. */
  readonly request: (request: Readonly<HttpRequest>) => Promise<HttpResponse>;
}

/** Read-only HTTP capability, safe to hand to code that must never send a mutating request. */
export interface GetOnlyHttpClient {
  /** Sends one HTTP `GET` request and resolves with its response. */
  readonly get: (request: Readonly<Omit<HttpRequest, "method" | "body">>) => Promise<HttpResponse>;
}

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

/** Every capability one command needs, assembled by the Node adapter and injected at the entrypoint. */
export interface CommandRuntime {
  /** Structured, redaction-aware command terminal presenter. */
  readonly presenter: TerminalPresenter;
  /** Interactive terminal prompts. */
  readonly prompts: PromptProvider;
  /** Engine-neutral child-process runner. */
  readonly runner: ProcessRunner;
  /** HTTP capability. */
  readonly http: HttpClient;
  /** Filesystem capability. */
  readonly files: FileSystem;
  /** Time capability. */
  readonly clock: Clock;
  /** Task orchestration capability. */
  readonly tasks: TaskScheduler;
  /** Shared, memoized repository inspection capability. */
  readonly inspection: RepositoryInspectionRuntime;
  /** Immutable snapshot of the ambient environment. */
  readonly environment: RuntimeEnvironment;
  /** Root cancellation signal for the whole command invocation. */
  readonly signal: AbortSignal;
  /** LIFO teardown registry drained once the command finishes. */
  readonly cleanup: CleanupRegistry;
}

/** Thrown when a command invocation is cancelled by signal or interrupt. */
export class CommandCancellation extends Error {
  /** Process exit code the caller should surface: `130` for `SIGINT`, `143` for `SIGTERM`. */
  public readonly exitCode: 130 | 143;

  /**
   * Creates a cancellation error carrying the exit code the caller should surface.
   *
   * @param message - Human-readable cancellation reason.
   * @param exitCode - `130` for an interactive interrupt, `143` for a termination request.
   */
  public constructor(message: string, exitCode: 130 | 143) {
    super(message);
    this.name = "CommandCancellation";
    this.exitCode = exitCode;
  }
}

/** Thrown when an {@link HttpClient} request fails to complete successfully. */
export class HttpError extends Error {
  /** The request's URL and method, without headers or body. */
  public readonly request: Readonly<Pick<HttpRequest, "url" | "method">>;
  /** Response status code, when the failure followed a completed response. */
  public readonly status?: number;

  /**
   * Creates an HTTP failure error.
   *
   * @param message - Human-readable failure message.
   * @param request - The request's URL and method, without headers or body.
   * @param options - Optional response status and original cause.
   */
  public constructor(
    message: string,
    request: Readonly<Pick<HttpRequest, "url" | "method">>,
    options?: Readonly<{status?: number; cause?: unknown}>,
  ) {
    super(message, options?.cause === undefined ? undefined : {cause: options.cause});
    this.name = "HttpError";
    this.request = request;
    if (options?.status !== undefined) {
      this.status = options.status;
    }
  }
}

/** Error code {@link FileSystemError} carries when {@link ReadOnlyFileSystem.readBytes} exceeds its bound. */
export const FILE_SYSTEM_MAX_BYTES_EXCEEDED_CODE = "MAX_BYTES_EXCEEDED";

/** Thrown when a {@link FileSystem} or {@link ReadOnlyFileSystem} operation fails. */
export class FileSystemError extends Error {
  /** The operation that failed, for example `"readBytes"` or `"assertAccessible"`. */
  public readonly operation: string;
  /** The path the failing operation targeted. */
  public readonly path: string;
  /** Platform or engine-defined error code, preserved from the underlying failure. */
  public readonly code?: string;

  /**
   * Creates a filesystem failure error.
   *
   * @param operation - The operation that failed.
   * @param path - The path the failing operation targeted.
   * @param message - Human-readable failure message.
   * @param options - Optional preserved error code and original cause.
   */
  public constructor(
    operation: string,
    path: string,
    message: string,
    options?: Readonly<{code?: string; cause?: unknown}>,
  ) {
    super(message, options?.cause === undefined ? undefined : {cause: options.cause});
    this.name = "FileSystemError";
    this.operation = operation;
    this.path = path;
    if (options?.code !== undefined) {
      this.code = options.code;
    }
  }
}

/**
 * Derives a {@link CommandCancellation} for an aborted signal, preserving an already-typed
 * cancellation reason instead of wrapping it a second time.
 *
 * @param signal - The aborted signal.
 * @param options - Optional fallback message and exit code used when `signal.reason` is not
 * already a {@link CommandCancellation}.
 * @returns A {@link CommandCancellation} describing why `signal` aborted.
 */
export function commandCancellationFromSignal(
  signal: AbortSignal,
  options?: Readonly<{message?: string; exitCode?: 130 | 143}>,
): CommandCancellation {
  const {reason} = signal;
  if (reason instanceof CommandCancellation) {
    return reason;
  }

  const message = options?.message ?? (reason instanceof Error ? reason.message : "Operation was cancelled.");
  const exitCode = options?.exitCode ?? 130;
  return new CommandCancellation(message, exitCode);
}

/** One abort signal derived from zero or more parent signals, with explicit teardown. */
export interface LinkedAbortSignal {
  /** Aborts once any linked parent signal aborts, propagating its reason. */
  readonly signal: AbortSignal;
  /** Detaches every parent listener without aborting {@link LinkedAbortSignal.signal}. */
  readonly dispose: () => void;
}

/**
 * Links zero or more optional parent signals into one child signal, so combining, for example,
 * a command's root cancellation signal with a per-call timeout signal never requires the caller
 * to track more than one signal, and disposing the link never leaks the parent listeners it added.
 *
 * @param signals - Parent signals to link; `undefined` entries are ignored.
 * @returns The linked signal and a disposer that detaches every parent listener.
 */
export function linkAbortSignals(...signals: readonly (AbortSignal | undefined)[]): LinkedAbortSignal {
  const controller = new AbortController();
  const parents = signals.filter((signal): signal is AbortSignal => signal !== undefined);

  const alreadyAborted = parents.find((signal) => signal.aborted);
  if (alreadyAborted !== undefined) {
    controller.abort(alreadyAborted.reason);
  }

  const listeners = parents.map((signal) => {
    const listener = (): void => {
      if (!controller.signal.aborted) {
        controller.abort(signal.reason);
      }
    };
    signal.addEventListener("abort", listener, {once: true});
    return {signal, listener};
  });

  const dispose = (): void => {
    for (const {signal, listener} of listeners) {
      signal.removeEventListener("abort", listener);
    }
  };

  return {signal: controller.signal, dispose};
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
function runAllSettled<T>(
  tasks: readonly (() => Promise<T>)[],
  signal?: AbortSignal,
): Promise<readonly PromiseSettledResult<T>[]> {
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
  public allSettled<T>(
    tasks: readonly (() => Promise<T>)[],
    signal?: AbortSignal,
  ): Promise<readonly PromiseSettledResult<T>[]> {
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

interface CleanupEntry {
  readonly label: string;
  readonly cleanup: () => void | Promise<void>;
  active: boolean;
}

/** Default {@link CleanupRegistry}: runs registered callbacks in last-registered-first-run order. */
export class LifoCleanupRegistry implements CleanupRegistry {
  readonly #entries: CleanupEntry[] = [];

  /** {@inheritDoc CleanupRegistry.register} */
  public register(label: string, cleanup: () => void | Promise<void>): () => void {
    const entry: CleanupEntry = {label, cleanup, active: true};
    this.#entries.push(entry);
    return (): void => {
      entry.active = false;
    };
  }

  /** {@inheritDoc CleanupRegistry.drain} */
  public async drain(): Promise<readonly CleanupFailure[]> {
    const failures: CleanupFailure[] = [];

    let entry = this.#entries.pop();
    while (entry !== undefined) {
      if (entry.active) {
        try {
          // Intentionally sequential: cleanup must run in strict LIFO order, one at a time.
          // eslint-disable-next-line no-await-in-loop
          await entry.cleanup();
        } catch (cause: unknown) {
          failures.push({
            label: entry.label,
            message: cause instanceof Error ? cause.message : String(cause),
            cause,
          });
        }
      }
      entry = this.#entries.pop();
    }

    return failures;
  }
}

/**
 * Restricts a {@link FileSystem} to its read-only surface, so code that must never mutate disk
 * state cannot call a mutating method even if it is handed the full capability by mistake.
 *
 * @param fileSystem - Full filesystem capability to restrict.
 * @returns A view exposing only {@link ReadOnlyFileSystem} members.
 */
export function asReadOnlyFileSystem(fileSystem: Readonly<FileSystem>): ReadOnlyFileSystem {
  return {
    readText: fileSystem.readText,
    readBytes: fileSystem.readBytes,
    exists: fileSystem.exists,
    assertAccessible: fileSystem.assertAccessible,
    realPath: fileSystem.realPath,
    inspect: fileSystem.inspect,
    readDirectory: fileSystem.readDirectory,
    glob: fileSystem.glob,
  };
}

/**
 * Restricts an {@link HttpClient} to `GET`-only requests, so code that must never send a mutating
 * request cannot call `request` with another method even if it is handed the full capability by
 * mistake.
 *
 * @param httpClient - Full HTTP capability to restrict.
 * @returns A view that always sends `GET` requests with no body.
 */
export function asGetOnlyHttpClient(httpClient: Readonly<HttpClient>): GetOnlyHttpClient {
  return {
    get: (request: Readonly<Omit<HttpRequest, "method" | "body">>): Promise<HttpResponse> =>
      httpClient.request({...request, method: "GET"}),
  };
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
   * @param keyOf - Derives the memoization key for a request; defaults to a canonical, sorted
   * serialization of the entire request.
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
  return canonicalJson({
    root: request.paths.root,
    profile: request.profile,
    requestedEngine: request.requestedEngine,
  });
}

/**
 * Builds the shared, memoized {@link RepositoryInspectionRuntime} a {@link CommandRuntime} exposes,
 * so every command that requests a session for the same root, profile, and requested engine
 * observes the exact same {@link RepositoryInspectionSession} instance.
 *
 * @param createSession - Builds a new session for a request that has not been seen before; the
 * Node adapter supplies this from `createRepositoryInspectionSession` bound to its own command
 * runner, environment, platform, and clock.
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
