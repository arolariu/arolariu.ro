/**
 * @fileoverview Sole Node.js-backed adapter for the engine-neutral runtime capability kernel.
 * @module scripts/common/runtime.node
 *
 * @remarks
 * Every concrete filesystem, native `fetch`, timer, environment, and process-host primitive a
 * command needs is implemented exactly once here, against the contracts declared in
 * `runtime.ts`. No other production script may import `node:fs`, `node:fs/promises`, `node:os`,
 * `node:timers`, `node:timers/promises`, call bare `fetch`/`setTimeout`/`setInterval`, or read
 * `process.env`/`process.platform`/`process.arch`/`process.execPath`/`process.pid`/`process.cwd()`
 * directly — the architecture guard (`runtime-boundary.test.ts`) enforces this file as the single
 * exemption. Every other command receives these primitives only through the capability objects
 * exported here (or, transitionally, by importing this module directly until the command tasks
 * that follow this one finish routing every caller through an injected {@link CommandRuntime}).
 */

import {constants as fsConstants} from "node:fs";
import {access, chmod, cp, mkdir, mkdtemp, open, readdir, readFile, realpath, rename, rm, stat, writeFile, glob as fsGlob} from "node:fs/promises";
import {tmpdir} from "node:os";
import {basename, dirname, resolve} from "node:path";
import {randomBytes} from "node:crypto";
import {setTimeout as delay} from "node:timers/promises";

import {ExecaProcessRunner} from "./runner.execa.ts";
import type {ProcessRunner} from "./runner.ts";
import {
  FILE_SYSTEM_MAX_BYTES_EXCEEDED_CODE,
  FileSystemError,
  HttpError,
  linkAbortSignals,
  type Clock,
  type DirectoryEntry,
  type FileKind,
  type FileMetadata,
  type FileSystem,
  type HttpClient,
  type HttpRequest,
  type HttpResponse,
  type RuntimeEnvironment,
  type TaskScheduler,
  type TemporaryDirectory,
} from "./runtime.ts";
import {DefaultTaskScheduler} from "./runtime.ts";

/** Maximum number of response bytes buffered when a request omits `maximumResponseBytes`. */
const DEFAULT_MAX_RESPONSE_BYTES = 10 * 1024 * 1024;

/** Maximum length of any bounded diagnostic detail embedded in a thrown {@link HttpError}. */
const MAX_ERROR_DETAIL_LENGTH = 2_000;

/** HTTP methods safe to retry automatically because they never have a mutating side effect the retry itself would duplicate. */
const IDEMPOTENT_HTTP_METHODS: ReadonlySet<string> = new Set(["GET", "PUT", "DELETE"]);

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function boundedText(text: string): string {
  return text.length > MAX_ERROR_DETAIL_LENGTH ? `${text.slice(0, MAX_ERROR_DETAIL_LENGTH)}…` : text;
}

function nodeErrorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return undefined;
  }
  const {code} = error as {code: unknown};
  return typeof code === "string" ? code : undefined;
}

function hasNodeErrorCode(error: unknown, code: string): boolean {
  return nodeErrorCode(error) === code;
}

function toFileSystemError(operation: string, path: string, error: unknown): FileSystemError {
  const code = nodeErrorCode(error);
  return new FileSystemError(operation, path, `Failed to ${operation} '${path}': ${errorMessage(error)}`, {
    ...(code === undefined ? {} : {code}),
    cause: error,
  });
}

/**
 * Writes text to a caller-owned destination through an exclusive random sibling, applying the
 * requested modes, then renaming the sibling onto the destination so readers never observe a
 * partially written file. Only the resolved sibling this call created is removed on failure.
 *
 * @param path - Destination path.
 * @param contents - Text to write.
 * @param options - Optional file mode and parent-directory creation mode.
 * @throws {FileSystemError} When the temporary write or final rename fails.
 */
async function writeTextAtomically(
  path: string,
  contents: string,
  options: Readonly<{mode?: number; directoryMode?: number}>,
): Promise<void> {
  const parent = dirname(path);
  const temporaryPath = resolve(parent, `.${basename(path)}.${randomBytes(8).toString("hex")}.tmp`);

  try {
    await mkdir(parent, {recursive: true, ...(options.directoryMode === undefined ? {} : {mode: options.directoryMode})});
    await writeFile(temporaryPath, contents, {
      encoding: "utf8",
      flag: "wx",
      ...(options.mode === undefined ? {} : {mode: options.mode}),
    });
    await rename(temporaryPath, path);
  } catch (error: unknown) {
    try {
      await rm(temporaryPath, {force: true});
    } catch {
      // Preserve the original write/rename failure; never widen cleanup past the exact sibling
      // this call created.
    }
    throw toFileSystemError("writeTextAtomic", path, error);
  }
}

function classifyFileKind(stats: Readonly<{isDirectory: () => boolean; isFile: () => boolean}>): Exclude<FileKind, "missing"> {
  if (stats.isDirectory()) {
    return "directory";
  }
  return stats.isFile() ? "file" : "other";
}

/**
 * Sole Node.js-backed {@link FileSystem} implementation. Every method maps directly onto one
 * `node:fs/promises` primitive (or a small composition of them) and reports failures as a
 * code-preserving {@link FileSystemError}, except {@link NodeFileSystem.readText} and the
 * unbounded branch of {@link NodeFileSystem.readBytes}, which return the underlying
 * `node:fs/promises` rejection unchanged so its platform error `code` is preserved without an
 * extra wrapping layer.
 */
export class NodeFileSystem implements FileSystem {
  /** {@inheritDoc ReadOnlyFileSystem.readText} */
  public readText(path: string): Promise<string> {
    return readFile(path, "utf8");
  }

  /** {@inheritDoc ReadOnlyFileSystem.readBytes} */
  public async readBytes(path: string, options: Readonly<{maximumBytes?: number}> = {}): Promise<Uint8Array> {
    const {maximumBytes} = options;
    if (maximumBytes === undefined) {
      return new Uint8Array(await readFile(path));
    }
    if (!Number.isSafeInteger(maximumBytes) || maximumBytes < 0) {
      throw new RangeError("maximumBytes must be a non-negative safe integer.");
    }

    const handle = await open(path, "r");
    try {
      const buffer = Buffer.allocUnsafe(maximumBytes + 1);
      let bytesRead = 0;
      while (bytesRead < buffer.length) {
        // Intentionally sequential: each read must observe the file position left by the
        // previous read into the same shared buffer.
        // eslint-disable-next-line no-await-in-loop
        const result = await handle.read(buffer, bytesRead, buffer.length - bytesRead, bytesRead);
        if (result.bytesRead === 0) {
          break;
        }
        bytesRead += result.bytesRead;
      }
      if (bytesRead > maximumBytes) {
        throw new FileSystemError("readBytes", path, `File exceeds the ${String(maximumBytes)} byte limit.`, {
          code: FILE_SYSTEM_MAX_BYTES_EXCEEDED_CODE,
        });
      }
      return new Uint8Array(buffer.subarray(0, bytesRead));
    } finally {
      await handle.close();
    }
  }

  /** {@inheritDoc ReadOnlyFileSystem.exists} */
  public async exists(path: string): Promise<boolean> {
    try {
      await access(path);
      return true;
    } catch (error: unknown) {
      if (hasNodeErrorCode(error, "ENOENT")) {
        return false;
      }
      throw toFileSystemError("exists", path, error);
    }
  }

  /** {@inheritDoc ReadOnlyFileSystem.assertAccessible} */
  public async assertAccessible(
    path: string,
    accessOptions: Readonly<{read?: boolean; write?: boolean; execute?: boolean}> = {},
  ): Promise<void> {
    let mode = 0;
    if (accessOptions.read === true) {
      mode |= fsConstants.R_OK;
    }
    if (accessOptions.write === true) {
      mode |= fsConstants.W_OK;
    }
    if (accessOptions.execute === true) {
      mode |= fsConstants.X_OK;
    }

    try {
      await access(path, mode === 0 ? fsConstants.F_OK : mode);
    } catch (error: unknown) {
      throw toFileSystemError("assertAccessible", path, error);
    }
  }

  /** {@inheritDoc ReadOnlyFileSystem.realPath} */
  public async realPath(path: string): Promise<string> {
    try {
      return await realpath(path);
    } catch (error: unknown) {
      throw toFileSystemError("realPath", path, error);
    }
  }

  /** {@inheritDoc ReadOnlyFileSystem.inspect} */
  public async inspect(path: string): Promise<FileMetadata> {
    try {
      const stats = await stat(path);
      return {
        kind: classifyFileKind(stats),
        size: stats.size,
        mode: stats.mode,
        modifiedAt: stats.mtime,
      };
    } catch (error: unknown) {
      if (hasNodeErrorCode(error, "ENOENT")) {
        return {kind: "missing", size: 0};
      }
      throw toFileSystemError("inspect", path, error);
    }
  }

  /** {@inheritDoc ReadOnlyFileSystem.readDirectory} */
  public async readDirectory(path: string): Promise<readonly DirectoryEntry[]> {
    try {
      const entries = await readdir(path, {withFileTypes: true});
      return entries.map((entry) => ({name: entry.name, kind: classifyFileKind(entry)}));
    } catch (error: unknown) {
      throw toFileSystemError("readDirectory", path, error);
    }
  }

  /** {@inheritDoc ReadOnlyFileSystem.glob} */
  public async glob(
    patterns: string | readonly string[],
    options: Readonly<{cwd?: string; onlyFiles?: boolean}> = {},
  ): Promise<readonly string[]> {
    const cwd = options.cwd ?? process.cwd();
    const matches: string[] = [];

    try {
      for await (const entry of fsGlob(patterns, {cwd, withFileTypes: true})) {
        if (options.onlyFiles === true && entry.isDirectory()) {
          continue;
        }
        matches.push(resolve(entry.parentPath, entry.name));
      }
    } catch (error: unknown) {
      throw toFileSystemError("glob", cwd, error);
    }

    return matches;
  }

  /** {@inheritDoc FileSystem.createDirectory} */
  public async createDirectory(path: string, options: Readonly<{recursive?: boolean; mode?: number}> = {}): Promise<void> {
    try {
      await mkdir(path, {recursive: options.recursive ?? false, ...(options.mode === undefined ? {} : {mode: options.mode})});
    } catch (error: unknown) {
      throw toFileSystemError("createDirectory", path, error);
    }
  }

  /** {@inheritDoc FileSystem.writeText} */
  public async writeText(path: string, contents: string, options: Readonly<{mode?: number; exclusive?: boolean}> = {}): Promise<void> {
    try {
      await writeFile(path, contents, {
        encoding: "utf8",
        flag: options.exclusive === true ? "wx" : "w",
        ...(options.mode === undefined ? {} : {mode: options.mode}),
      });
    } catch (error: unknown) {
      throw toFileSystemError("writeText", path, error);
    }
  }

  /** {@inheritDoc FileSystem.writeBytes} */
  public async writeBytes(path: string, contents: Uint8Array, options: Readonly<{mode?: number; exclusive?: boolean}> = {}): Promise<void> {
    try {
      await writeFile(path, contents, {
        flag: options.exclusive === true ? "wx" : "w",
        ...(options.mode === undefined ? {} : {mode: options.mode}),
      });
    } catch (error: unknown) {
      throw toFileSystemError("writeBytes", path, error);
    }
  }

  /** {@inheritDoc FileSystem.writeTextAtomic} */
  public writeTextAtomic(path: string, contents: string, options: Readonly<{mode?: number; directoryMode?: number}> = {}): Promise<void> {
    return writeTextAtomically(path, contents, options);
  }

  /** {@inheritDoc FileSystem.copy} */
  public async copy(source: string, destination: string, options: Readonly<{recursive?: boolean; force?: boolean}> = {}): Promise<void> {
    try {
      await cp(source, destination, {recursive: options.recursive ?? false, force: options.force ?? true});
    } catch (error: unknown) {
      throw toFileSystemError("copy", source, error);
    }
  }

  /** {@inheritDoc FileSystem.move} */
  public async move(source: string, destination: string): Promise<void> {
    try {
      await rename(source, destination);
    } catch (error: unknown) {
      throw toFileSystemError("move", source, error);
    }
  }

  /** {@inheritDoc FileSystem.remove} */
  public async remove(path: string, options: Readonly<{recursive?: boolean; force?: boolean}> = {}): Promise<void> {
    try {
      await rm(path, {recursive: options.recursive ?? false, force: options.force ?? false});
    } catch (error: unknown) {
      throw toFileSystemError("remove", path, error);
    }
  }

  /** {@inheritDoc FileSystem.createTemporaryDirectory} */
  public async createTemporaryDirectory(prefix: string): Promise<TemporaryDirectory> {
    let directoryPath: string;
    try {
      directoryPath = await mkdtemp(resolve(tmpdir(), prefix));
    } catch (error: unknown) {
      throw toFileSystemError("createTemporaryDirectory", prefix, error);
    }

    return {
      path: directoryPath,
      remove: async (): Promise<void> => {
        try {
          await rm(directoryPath, {recursive: true, force: true});
        } catch (error: unknown) {
          throw toFileSystemError("createTemporaryDirectory.remove", directoryPath, error);
        }
      },
    };
  }

  /** {@inheritDoc FileSystem.setMode} */
  public async setMode(path: string, mode: number): Promise<void> {
    try {
      await chmod(path, mode);
    } catch (error: unknown) {
      throw toFileSystemError("setMode", path, error);
    }
  }
}

/** Sole Node.js-backed {@link FileSystem}. */
export const nodeFileSystem: FileSystem = new NodeFileSystem();

function isIdempotentHttpMethod(method: NonNullable<HttpRequest["method"]>): boolean {
  return IDEMPOTENT_HTTP_METHODS.has(method);
}

function headersToRecord(headers: Readonly<Headers>): Readonly<Record<string, string>> {
  const record: Record<string, string> = {};
  for (const [name, value] of headers.entries()) {
    record[name] = value;
  }
  return record;
}

/**
 * Normalizes any failure that is not already an {@link HttpError} into a bounded, redacted one so
 * every escape path from {@link NativeHttpClient} — the initial `fetch()` call, a body-stream
 * read, a caller/timeout abort, a connection reset, or an abort during retry backoff — carries
 * only `{url, method}` diagnostics behind the same contract.
 *
 * @param error - The failure to normalize; an existing {@link HttpError} is returned unchanged.
 * @param request - The request's URL and method, without headers or body.
 * @param context - Short phrase describing which phase failed, embedded in the message.
 * @returns `error` unchanged when it is already an {@link HttpError}; otherwise a new bounded one.
 */
function toHttpError(error: unknown, request: Readonly<Pick<HttpRequest, "url" | "method">>, context: string): HttpError {
  if (error instanceof HttpError) {
    return error;
  }
  return new HttpError(`${context}: ${boundedText(errorMessage(error))}`, request, {cause: error});
}

async function readBoundedResponseBytes(
  response: Response,
  maximumBytes: number,
  request: Readonly<Pick<HttpRequest, "url" | "method">>,
): Promise<Uint8Array> {
  if (response.body === null) {
    return new Uint8Array(0);
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      let done: boolean;
      let value: Uint8Array | undefined;
      try {
        // Intentionally sequential: each chunk must be measured against the running total before
        // the next chunk is requested, so the limit is enforced before any further bytes are read.
        // eslint-disable-next-line no-await-in-loop
        ({done, value} = await reader.read());
      } catch (error: unknown) {
        // A caller/timeout abort, a connection reset, or any other body-stream failure surfaces
        // here as a raw platform error (for example a `DOMException`) once headers have already
        // been received; normalize it through the same bounded `HttpError` contract as every
        // other failure path instead of letting it escape unwrapped.
        throw toHttpError(error, request, "HTTP response body read failed");
      }
      if (done) {
        break;
      }
      if (value === undefined) {
        continue;
      }

      total += value.byteLength;
      if (total > maximumBytes) {
        await reader.cancel(`Response exceeded the ${String(maximumBytes)} byte limit.`);
        throw new HttpError(`Response exceeded the ${String(maximumBytes)} byte limit.`, request, {status: response.status});
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return merged;
}

function toFetchBody(body: string | Uint8Array): string | Buffer<ArrayBuffer> {
  if (typeof body === "string") {
    return body;
  }
  // Node's `Buffer` (backed by a concrete `ArrayBuffer`) satisfies `BodyInit`; a bare `Uint8Array`
  // typed over the wider `ArrayBufferLike` does not, under this project's `exactOptionalPropertyTypes`
  // and current DOM lib typings.
  return Buffer.from(body);
}

/**
 * Sole Node.js-backed {@link HttpClient} implementation, built on the native `fetch`.
 *
 * @remarks
 * `request()` links the caller's optional {@link HttpRequest.signal} with exactly one
 * {@link HttpRequest.timeoutMs}-based deadline signal covering the entire call, so
 * `timeoutMs` bounds every retried attempt plus every backoff delay together instead of
 * restarting on each attempt; either signal cancels the underlying `fetch` and the retry
 * backoff `delay()`. Response bytes are bounded and measured while still streaming so an
 * oversized response is rejected before it is fully buffered or decoded; a retry is only ever
 * attempted when the caller supplies an explicit {@link HttpRequest.retry} policy for a request
 * whose method ({@link IDEMPOTENT_HTTP_METHODS}) is safe to repeat; and every failure — the
 * initial `fetch()` call, a body-stream read, a caller/timeout abort, a connection reset, or an
 * abort during retry backoff — is normalized into a bounded {@link HttpError} via
 * {@link toHttpError} instead of escaping as a raw platform error (for example `DOMException`).
 */
export class NativeHttpClient implements HttpClient {
  /** {@inheritDoc HttpClient.request} */
  public async request(request: Readonly<HttpRequest>): Promise<HttpResponse> {
    const method = request.method ?? "GET";
    const retryPolicy = request.retry;
    const attemptsAllowed = retryPolicy !== undefined && isIdempotentHttpMethod(method) ? Math.max(1, retryPolicy.attempts) : 1;
    const requestIdentity = {url: request.url, method};

    // One deadline signal for the whole call: created once here (not per attempt), it links the
    // caller's signal with a single `timeoutMs`-based timeout so the overall budget covers every
    // attempt and every retry delay together, instead of each attempt resetting its own timer.
    const deadlineTimeoutSignal = request.timeoutMs === undefined ? undefined : AbortSignal.timeout(request.timeoutMs);
    const deadline = linkAbortSignals(request.signal, deadlineTimeoutSignal);

    try {
      let attempt = 1;
      while (true) {
        // Intentionally sequential: a retry must observe the previous attempt's response status
        // before deciding whether to wait and try again.
        // eslint-disable-next-line no-await-in-loop
        const response = await this.#send(request, method, deadline.signal, requestIdentity);
        const shouldRetry = retryPolicy !== undefined && attempt < attemptsAllowed && retryPolicy.statuses.includes(response.status);
        if (!shouldRetry) {
          return response;
        }

        try {
          // eslint-disable-next-line no-await-in-loop
          await delay(retryPolicy.delayMs, undefined, {signal: deadline.signal});
        } catch (error: unknown) {
          // A caller abort or the overall timeout firing while waiting to retry surfaces here as
          // a raw `DOMException`; normalize it through the same bounded `HttpError` contract.
          throw toHttpError(error, requestIdentity, "HTTP request cancelled during retry backoff");
        }
        attempt += 1;
      }
    } finally {
      deadline.dispose();
    }
  }

  async #send(
    request: Readonly<HttpRequest>,
    method: NonNullable<HttpRequest["method"]>,
    signal: AbortSignal,
    requestIdentity: Readonly<Pick<HttpRequest, "url" | "method">>,
  ): Promise<HttpResponse> {
    let response: Response;
    try {
      response = await fetch(request.url, {
        method,
        ...(request.headers === undefined ? {} : {headers: request.headers}),
        ...(request.body === undefined ? {} : {body: toFetchBody(request.body)}),
        signal,
      });
    } catch (error: unknown) {
      throw toHttpError(error, requestIdentity, "HTTP request failed");
    }

    const bytes = await readBoundedResponseBytes(response, request.maximumResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES, requestIdentity);

    return {
      status: response.status,
      ok: response.ok,
      headers: headersToRecord(response.headers),
      bytes,
      text: new TextDecoder("utf-8").decode(bytes),
    };
  }
}

/** Sole Node.js-backed {@link HttpClient}. */
export const nodeHttpClient: HttpClient = new NativeHttpClient();

/** Sole Node.js-backed {@link Clock}. */
export const nodeClock: Clock = {
  monotonicNow: (): number => performance.now(),
  isoTimestamp: (): string => new Date().toISOString(),
  delay: (milliseconds: number, signal?: AbortSignal): Promise<void> => delay(milliseconds, undefined, {signal}),
};

/** Sole Node.js-backed {@link TaskScheduler}; engine-neutral, so it simply reuses {@link DefaultTaskScheduler}. */
export const nodeTaskScheduler: TaskScheduler = new DefaultTaskScheduler();

/**
 * Builds an Execa-backed {@link ProcessRunner} bound to one immutable environment snapshot.
 *
 * @param environment - The exact environment variables and platform every spawned child observes.
 * @returns A process runner that never reads ambient `process.env`/`process.platform` itself.
 */
export function createNodeProcessRunner(environment: Readonly<RuntimeEnvironment>): ProcessRunner {
  return new ExecaProcessRunner({
    baseEnvironment: environment.variables,
    platform: environment.platform,
    monotonicNow: (): number => performance.now(),
  });
}

/**
 * Captures an immutable snapshot of the ambient Node environment.
 *
 * @remarks
 * `variables` is a fresh plain object copied from `process.env` at call time, so a later mutation
 * of `process.env` never changes an already-captured snapshot.
 *
 * @returns The current environment, working directory, host platform/architecture, terminal
 * state, and CI detection.
 */
export function snapshotNodeEnvironment(): RuntimeEnvironment {
  return {
    variables: {...process.env},
    cwd: process.cwd(),
    executablePath: process.execPath,
    platform: process.platform,
    architecture: process.arch,
    stdinIsTTY: process.stdin.isTTY === true,
    stdoutIsTTY: process.stdout.isTTY === true,
    isCI: Boolean(process.env["CI"] ?? process.env["GITHUB_ACTIONS"]),
  };
}

/**
 * Compatibility facade over {@link createNodeProcessRunner} that snapshots the ambient
 * environment fresh at each standalone call instead of once at module load.
 *
 * @remarks
 * Reserved for the legacy `scripts/common/process.ts` facade and `scripts/workers/shell.ts`
 * worker helpers, both of which invoke a runner exactly once per call with no shared lifetime
 * across invocations. Command scopes must construct their own runner from one
 * {@link snapshotNodeEnvironment} call via {@link createNodeProcessRunner} instead of using this
 * facade, so every command observes one environment snapshot for its entire run.
 */
export const nodeProcessRunner: ProcessRunner = {
  run: (request, options) => createNodeProcessRunner(snapshotNodeEnvironment()).run(request, options),
  expectSuccess: (request, options) => createNodeProcessRunner(snapshotNodeEnvironment()).expectSuccess(request, options),
  scope: (defaults) => createNodeProcessRunner(snapshotNodeEnvironment()).scope(defaults),
};
