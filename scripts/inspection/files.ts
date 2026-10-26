/**
 * @fileoverview Read-only file observations shared by the repository inspection providers.
 * @module scripts/inspection/files
 *
 * @remarks
 * Thin helpers over the {@link ReadOnlyFiles} service that keep the observation vocabulary the
 * providers classify on: {@link inspectPath} reports a missing path as `kind: "missing"` instead of
 * failing, and {@link fileErrorCode} reads the Node error code (`ENOENT`, `ENOTDIR`, …) of a
 * failure, falling back to the code of its platform reason when the failure carries none (the
 * in-memory test filesystem).
 */

import {Effect, type PlatformError} from "effect";

import {ReadOnlyFiles, type MaxBytesExceeded} from "../platform/Files.ts";

/** Every failure a read-only inspection file observation can report. */
export type InspectionFileError = PlatformError.PlatformError | MaxBytesExceeded;

/** Kind and size of one inspected path; a path that does not exist is `"missing"` with size `0`. */
export interface InspectedPath {
  /** What the path resolves to (symbolic links are followed). */
  readonly kind: "file" | "directory" | "other" | "missing";
  /** Size in bytes; `0` for a missing path. */
  readonly size: number;
}

/** Node error code of each platform failure reason, used when the failure carries no Node `code`. */
const REASON_CODES: Readonly<Record<string, string>> = {
  NotFound: "ENOENT",
  PermissionDenied: "EACCES",
  AlreadyExists: "EEXIST",
  BadResource: "EBADF",
  Busy: "EBUSY",
  InvalidData: "EINVAL",
  TimedOut: "ETIMEDOUT",
  UnexpectedEof: "EOF",
  BadArgument: "EINVAL",
};

/**
 * Reads the Node error code of a file observation failure.
 *
 * @param error - The failure.
 * @returns The underlying Node `code` when the failure's cause carries one, else the code of its
 * platform reason (`NotFound` → `ENOENT`, …, otherwise `EUNKNOWN`); `undefined` for
 * {@link MaxBytesExceeded}, which callers classify by its `_tag`.
 */
export function fileErrorCode(error: InspectionFileError): string | undefined {
  if (error._tag === "MaxBytesExceeded") {
    return undefined;
  }
  const cause: unknown = error.reason.cause;
  if (typeof cause === "object" && cause !== null && "code" in cause && typeof cause.code === "string") {
    return cause.code;
  }
  return REASON_CODES[error.reason._tag] ?? "EUNKNOWN";
}

/**
 * Reads one UTF-8 text file.
 *
 * @param path - The file to read.
 * @returns The file contents.
 */
export function readText(path: string): Effect.Effect<string, PlatformError.PlatformError, ReadOnlyFiles> {
  return Effect.flatMap(ReadOnlyFiles, (files) => files.readFileString(path));
}

/**
 * Reads at most `maximumBytes` bytes of one file.
 *
 * @param path - The file to read.
 * @param maximumBytes - Largest accepted size in bytes.
 * @returns The file contents, failing with {@link MaxBytesExceeded} when the file is larger.
 */
export function readBytes(path: string, maximumBytes: number): Effect.Effect<Uint8Array, InspectionFileError, ReadOnlyFiles> {
  return Effect.flatMap(ReadOnlyFiles, (files) => files.readBytesBounded(path, maximumBytes));
}

/**
 * Resolves the canonical path of one existing path.
 *
 * @param path - The path to resolve.
 * @returns The canonical path with every symbolic link resolved.
 */
export function realPath(path: string): Effect.Effect<string, PlatformError.PlatformError, ReadOnlyFiles> {
  return Effect.flatMap(ReadOnlyFiles, (files) => files.realPath(path));
}

/**
 * Inspects what one path resolves to.
 *
 * @param path - The path to inspect.
 * @returns Its kind and size; a path whose stat fails with `ENOENT` is `"missing"`, and every other
 * failure is reported unchanged.
 */
export function inspectPath(path: string): Effect.Effect<InspectedPath, PlatformError.PlatformError, ReadOnlyFiles> {
  return Effect.flatMap(ReadOnlyFiles, (files) =>
    files.stat(path).pipe(
      Effect.map((info): InspectedPath => ({
        kind: info.type === "File" ? "file" : info.type === "Directory" ? "directory" : "other",
        size: Number(info.size),
      })),
      Effect.catchIf(
        (error) => fileErrorCode(error) === "ENOENT",
        () => Effect.succeed<InspectedPath>({kind: "missing", size: 0}),
      ),
    ),
  );
}
