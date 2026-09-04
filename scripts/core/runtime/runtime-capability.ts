/**
 * @fileoverview Every engine-neutral capability a workflow module may declare: the capability-name
 * union, the service contract behind each name, the typed failures those services raise, and the
 * narrowing helpers that hand out a reduced view of one capability.
 * @module scripts/core/runtime/runtime-capability
 *
 * @remarks
 * This module describes *what* a command needs — environment, clock, task scheduling, cleanup,
 * filesystem, network, process execution, prompts, presentation, and cancellation — without ever
 * naming or reaching a concrete engine primitive. Every contract here is satisfiable by a plain
 * in-memory fake, which is what keeps the whole command surface testable without real input or
 * output.
 */

import type {TerminalPresenter} from "../presentation/terminal-presenter.ts";
import type {ProcessRunner} from "../process/process-runner.ts";
import type {CleanupRegistry} from "./cleanup.ts";
import type {TaskScheduler} from "./task-scheduler.ts";

/** The exact engine-neutral capability names a workflow module may declare. */
export const runtimeCapabilityNames = [
  "presenter",
  "prompts",
  "runner",
  "http",
  "files",
  "clock",
  "tasks",
  "environment",
  "signal",
  "cleanup",
] as const;

/** One of the exact engine-neutral capability names a workflow module may declare. */
export type RuntimeCapabilityName = (typeof runtimeCapabilityNames)[number];

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
  /** Throws a code-preserving {@link FileSystemError} unless every requested access mode is currently permitted for `path`. */
  readonly assertAccessible: (path: string, access?: Readonly<{read?: boolean; write?: boolean; execute?: boolean}>) => Promise<void>;
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
  readonly writeText: (path: string, contents: string, options?: Readonly<{mode?: number; exclusive?: boolean}>) => Promise<void>;
  /** Writes raw bytes to one file, replacing its contents. */
  readonly writeBytes: (path: string, contents: Uint8Array, options?: Readonly<{mode?: number; exclusive?: boolean}>) => Promise<void>;
  /** Writes UTF-8 text so readers never observe a partially written file. */
  readonly writeTextAtomic: (path: string, contents: string, options?: Readonly<{mode?: number; directoryMode?: number}>) => Promise<void>;
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

/** One selectable prompt value and its human-readable label. */
export interface PromptChoice<TValue extends string> {
  /** Value returned when this choice is selected. */
  readonly value: TValue;
  /** Human-readable choice label. */
  readonly label: string;
}

/** Interactive prompt operations a command may request from its terminal. */
export interface PromptProvider {
  /** Requests a yes/no decision. */
  readonly confirm: (message: string, defaultValue?: boolean) => Promise<boolean>;
  /** Requests one value from a fixed set of choices. */
  readonly select: <TValue extends string>(
    message: string,
    choices: readonly PromptChoice<TValue>[],
    defaultValue?: TValue,
  ) => Promise<TValue>;
  /** Requests visible free-form text. */
  readonly text: (message: string) => Promise<string>;
  /** Requests secret text without echoing typed characters. */
  readonly secret: (message: string) => Promise<string>;
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
  ) {    super(message, options?.cause === undefined ? undefined : {cause: options.cause});
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
  public constructor(operation: string, path: string, message: string, options?: Readonly<{code?: string; cause?: unknown}>) {
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
 * Restricts a {@link FileSystem} to its read-only surface, so code that must never mutate disk
 * state cannot call a mutating method.
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
 * request cannot call `request` with another method.
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

/** Structured, redaction-aware command terminal presentation. */
export interface PresentationRuntimeCapability {
  /** The scope's presenter. */
  readonly presenter: TerminalPresenter;
}

/** Root cancellation signal for one command scope. */
export interface CancellationRuntimeCapability {
  /** The scope's cancellation signal. */
  readonly signal: AbortSignal;
}

/** LIFO teardown registry drained once the owning scope finishes. */
export interface CleanupRuntimeCapability {
  /** The scope's cleanup registry. */
  readonly cleanup: CleanupRegistry;
}

/** Immutable snapshot of the ambient environment. */
export interface EnvironmentRuntimeCapability {
  /** The scope's environment snapshot. */
  readonly environment: RuntimeEnvironment;
}

/** Filesystem capability. */
export interface FilesystemRuntimeCapability {
  /** The scope's filesystem. */
  readonly files: FileSystem;
}

/** HTTP capability. */
export interface NetworkRuntimeCapability {
  /** The scope's HTTP client. */
  readonly http: HttpClient;
}

/** Engine-neutral child-process execution capability. */
export interface ProcessRuntimeCapability {
  /** The scope's process runner. */
  readonly runner: ProcessRunner;
}

/** Time capability. */
export interface TimeRuntimeCapability {
  /** The scope's clock. */
  readonly clock: Clock;
}

/** Task orchestration capability. */
export interface TaskRuntimeCapability {
  /** The scope's task scheduler. */
  readonly tasks: TaskScheduler;
}

/** Interactive terminal prompt capability. */
export interface PromptRuntimeCapability {
  /** The scope's prompt provider. */
  readonly prompts: PromptProvider;
}

/** The capabilities every workflow scope owns before it resolves anything heavier. */
export type BaseWorkflowRuntimeExecutionContext = Readonly<
  PresentationRuntimeCapability & CancellationRuntimeCapability & CleanupRuntimeCapability
>;
