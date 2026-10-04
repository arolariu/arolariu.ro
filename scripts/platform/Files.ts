/**
 * @fileoverview Effect file helpers, the `Glob` service, and the read-only `ReadOnlyFiles` and
 * `GetOnlyHttp` views.
 * @module scripts/platform/Files
 *
 * @remarks
 * Effect counterpart of the legacy filesystem and HTTP capabilities (`scripts/common/runtime.ts`,
 * `scripts/common/runtime.node.ts`). {@link readBytesBounded} and {@link writeTextAtomic} port the
 * legacy `NodeFileSystem.readBytes` (bounded branch) and `writeTextAtomic` contracts on top of the
 * Effect `FileSystem`. {@link Glob} fills a gap in Effect, which has no glob primitive, and
 * {@link GlobLive} ports `NodeFileSystem.glob`. {@link ReadOnlyFiles} and {@link GetOnlyHttp} are
 * narrowed views whose shapes carry no mutating member, so a read-only command profile (Doctor,
 * Status, Inspection) cannot write files or issue non-GET requests at compile time.
 * {@link TemporaryDirectories} is the single writable capability such a profile receives: a
 * scope-owned temporary directory outside the repository.
 */

import {glob as nodeGlob} from "node:fs/promises";
import {resolve} from "node:path";

import {Context, Effect, FileSystem, Layer, Path, PlatformError, Schema, type Cause, type Duration, type Scope} from "effect";
import {HttpClient, type HttpClientError, type HttpClientResponse} from "effect/http";

/** A bounded read observed more bytes than its caller allowed. */
export class MaxBytesExceeded extends Schema.TaggedError<MaxBytesExceeded>()("MaxBytesExceeded", {
  path: Schema.String,
  maximumBytes: Schema.Number,
  message: Schema.String,
}) {}

/**
 * Reads one file through an opened handle, buffering at most `maximumBytes + 1` bytes.
 *
 * @remarks
 * The file is never stat-ed first (a size check that can race a concurrent write); the extra byte
 * is how an oversized file is detected. The handle is closed when the read completes, fails, or is
 * interrupted.
 *
 * @param path - File to read.
 * @param maximumBytes - Largest accepted size in bytes; must be a non-negative safe integer.
 * @returns The file contents, failing with {@link MaxBytesExceeded} once the file is observed to be
 * larger than `maximumBytes`, or with a `BadArgument` {@link PlatformError.PlatformError} for an
 * invalid limit.
 */
export function readBytesBounded(
  path: string,
  maximumBytes: number,
): Effect.Effect<Uint8Array, PlatformError.PlatformError | MaxBytesExceeded, FileSystem.FileSystem> {
  if (!Number.isSafeInteger(maximumBytes) || maximumBytes < 0) {
    return Effect.fail(
      PlatformError.badArgument({
        module: "Files",
        method: "readBytesBounded",
        description: "maximumBytes must be a non-negative safe integer.",
      }),
    );
  }

  return Effect.scoped(
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const file = yield* fs.open(path, {flag: "r"});
      const buffer = new Uint8Array(maximumBytes + 1);
      let bytesRead = 0;
      while (bytesRead < buffer.length) {
        // Sequential by design: each read continues from the position the previous read left.
        const count = yield* file.read(buffer.subarray(bytesRead));
        if (count === 0) {
          break;
        }
        bytesRead += count;
      }
      if (bytesRead > maximumBytes) {
        return yield* new MaxBytesExceeded({
          path,
          maximumBytes,
          message: `File '${path}' exceeds the ${String(maximumBytes)} byte limit.`,
        });
      }
      return buffer.slice(0, bytesRead);
    }),
  );
}

/**
 * Builds the random hexadecimal suffix of an atomic-write sibling.
 *
 * @returns Sixteen lowercase hexadecimal characters.
 */
function randomSuffix(): string {
  return Array.from(globalThis.crypto.getRandomValues(new Uint8Array(8)), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Writes UTF-8 text so readers never observe a partially written file.
 *
 * @remarks
 * Creates the parent directory (recursively, with `directoryMode` when set), writes an exclusive
 * sibling `.<basename>.<random>.tmp` with `mode` when set, then renames it over `path`. On any
 * failure or interruption only that sibling is removed and the original error is preserved.
 *
 * @param path - Destination path.
 * @param contents - Text to write.
 * @param options - Optional file mode and parent-directory creation mode.
 * @returns An effect that completes once the destination holds `contents`.
 */
export function writeTextAtomic(
  path: string,
  contents: string,
  options: {readonly mode?: number; readonly directoryMode?: number} = {},
): Effect.Effect<void, PlatformError.PlatformError, FileSystem.FileSystem | Path.Path> {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const paths = yield* Path.Path;
    const parent = paths.dirname(path);
    const temporaryPath = paths.resolve(parent, `.${paths.basename(path)}.${randomSuffix()}.tmp`);

    yield* Effect.gen(function* () {
      yield* fs.makeDirectory(parent, {
        recursive: true,
        ...(options.directoryMode === undefined ? {} : {mode: options.directoryMode}),
      });
      yield* fs.writeFileString(temporaryPath, contents, {
        flag: "wx",
        ...(options.mode === undefined ? {} : {mode: options.mode}),
      });
      yield* fs.rename(temporaryPath, path);
    }).pipe(Effect.onError(() => Effect.ignore(fs.remove(temporaryPath, {force: true}))));
  });
}

/** Options accepted by {@link Glob} matching. */
export interface GlobOptions {
  /** Directory the patterns are resolved against; defaults to the process working directory. */
  readonly cwd?: string;
  /** Whether directories are excluded from the results. */
  readonly onlyFiles?: boolean;
}

/** Shape of the {@link Glob} service. */
export interface GlobShape {
  /**
   * Resolves one or more glob patterns to absolute matching paths, in the order the underlying
   * directory walk yields them.
   */
  readonly match: (patterns: string | readonly string[], options?: GlobOptions) => Effect.Effect<readonly string[], PlatformError.PlatformError>;
}

/** Service tag for glob pattern matching. */
export class Glob extends Context.Service<Glob, GlobShape>()("arolariu/scripts/Glob") {}

/** Node.js error codes a glob walk can raise, normalized to platform system-error tags. */
const SYSTEM_ERROR_TAGS: ReadonlyMap<unknown, PlatformError.SystemErrorTag> = new Map<unknown, PlatformError.SystemErrorTag>([
  ["ENOENT", "NotFound"],
  ["EACCES", "PermissionDenied"],
  ["EPERM", "PermissionDenied"],
  ["EEXIST", "AlreadyExists"],
  ["ENOTDIR", "BadResource"],
  ["EISDIR", "BadResource"],
  ["EBUSY", "Busy"],
]);

/**
 * Wraps a failed glob walk in a {@link PlatformError.PlatformError} that keeps the original cause.
 *
 * @param cwd - Directory the walk ran in.
 * @param error - The rejection raised by the walk.
 * @returns A system-error {@link PlatformError.PlatformError} for the `Glob.match` call.
 */
function globError(cwd: string, error: unknown): PlatformError.PlatformError {
  const code: unknown = typeof error === "object" && error !== null && "code" in error ? error.code : undefined;
  return PlatformError.systemError({
    _tag: SYSTEM_ERROR_TAGS.get(code) ?? "Unknown",
    module: "Glob",
    method: "match",
    pathOrDescriptor: cwd,
    description: error instanceof Error ? error.message : String(error),
    cause: error,
  });
}

/** Live {@link Glob} layer over `node:fs/promises` `glob`, matching the legacy adapter's output. */
export const GlobLive: Layer.Layer<Glob> = Layer.succeed(Glob, {
  match: (patterns, options = {}) =>
    Effect.tryPromise({
      try: async (signal) => {
        const matches: string[] = [];
        const walk = nodeGlob(patterns, {...(options.cwd === undefined ? {} : {cwd: options.cwd}), withFileTypes: true});
        for await (const entry of walk) {
          if (signal.aborted) {
            break;
          }
          if (options.onlyFiles === true && entry.isDirectory()) {
            continue;
          }
          matches.push(resolve(entry.parentPath, entry.name));
        }
        return matches;
      },
      catch: (error) => globError(options.cwd ?? ".", error),
    }),
});

/** Read-only filesystem view: a subset of the Effect `FileSystem` plus glob and bounded reads. */
export type ReadOnlyFileSystemShape = Pick<
  FileSystem.FileSystem,
  "readFile" | "readFileString" | "exists" | "access" | "realPath" | "stat" | "readDirectory"
> & {
  /** Resolves glob patterns to absolute matching paths; see {@link Glob}. */
  readonly glob: Glob["Service"]["match"];
  /** Reads at most `maximumBytes` bytes; see {@link readBytesBounded}. */
  readonly readBytesBounded: (path: string, maximumBytes: number) => Effect.Effect<Uint8Array, PlatformError.PlatformError | MaxBytesExceeded>;
};

/** Service tag for the {@link ReadOnlyFileSystemShape} view. */
export class ReadOnlyFiles extends Context.Service<ReadOnlyFiles, ReadOnlyFileSystemShape>()("arolariu/scripts/ReadOnlyFiles") {}

/** Live {@link ReadOnlyFiles} layer that exposes only the read members of `FileSystem` and `Glob`. */
export const ReadOnlyFilesLive: Layer.Layer<ReadOnlyFiles, never, FileSystem.FileSystem | Glob> = Layer.effect(
  ReadOnlyFiles,
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const glob = yield* Glob;
    return Object.freeze({
      readFile: fs.readFile,
      readFileString: fs.readFileString,
      exists: fs.exists,
      access: fs.access,
      realPath: fs.realPath,
      stat: fs.stat,
      readDirectory: fs.readDirectory,
      glob: glob.match,
      readBytesBounded: (path: string, maximumBytes: number) =>
        readBytesBounded(path, maximumBytes).pipe(Effect.provideService(FileSystem.FileSystem, fs)),
    });
  }),
);

/**
 * Service tag for caller-owned temporary directories, the single writable capability of a
 * read-only profile (Inspection).
 *
 * @remarks
 * `make(prefix)` creates a fresh directory whose name starts with `prefix` under the platform
 * temporary root and removes it, recursively, when the surrounding scope closes.
 */
export class TemporaryDirectories extends Context.Service<
  TemporaryDirectories,
  {
    /** Creates a temporary directory that lives until the surrounding scope closes. */
    readonly make: (prefix: string) => Effect.Effect<string, PlatformError.PlatformError, Scope.Scope>;
  }
>()("arolariu/scripts/TemporaryDirectories") {}

/** Live {@link TemporaryDirectories} layer over `FileSystem.makeTempDirectoryScoped`. */
export const TemporaryDirectoriesLive: Layer.Layer<TemporaryDirectories, never, FileSystem.FileSystem> = Layer.effect(
  TemporaryDirectories,
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    return TemporaryDirectories.of({make: (prefix) => fs.makeTempDirectoryScoped({prefix})});
  }),
);

/** Options accepted by {@link GetOnlyHttp} requests. */
export interface GetOnlyHttpOptions {
  /** Request headers. */
  readonly headers?: Readonly<Record<string, string>>;
  /** Time limit after which the request is interrupted and fails with `Cause.TimeoutError`. */
  readonly timeout?: Duration.Input;
}

/** Shape of the {@link GetOnlyHttp} service. */
export interface GetOnlyHttpShape {
  /** Issues one `GET` request. */
  readonly get: (
    url: string,
    options?: GetOnlyHttpOptions,
  ) => Effect.Effect<HttpClientResponse.HttpClientResponse, HttpClientError.HttpClientError | Cause.TimeoutError>;
}

/** Service tag for an HTTP client view that can only issue `GET` requests. */
export class GetOnlyHttp extends Context.Service<GetOnlyHttp, GetOnlyHttpShape>()("arolariu/scripts/GetOnlyHttp") {}

/** Live {@link GetOnlyHttp} layer over the Effect `HttpClient`. */
export const GetOnlyHttpLive: Layer.Layer<GetOnlyHttp, never, HttpClient.HttpClient> = Layer.effect(
  GetOnlyHttp,
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient;
    return Object.freeze({
      get: (url: string, options: GetOnlyHttpOptions = {}) => {
        const request = client.get(url, options.headers === undefined ? undefined : {headers: options.headers});
        return options.timeout === undefined ? request : Effect.timeout(request, options.timeout);
      },
    });
  }),
);
