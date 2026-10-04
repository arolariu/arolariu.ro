/**
 * @fileoverview Temporary interop bridge between legacy Promise commands and Effect programs.
 * @module scripts/platform/bridge
 *
 * @remarks
 * {@link runEffect} lets a legacy Promise command run an Effect program with the platform layer;
 * {@link legacyInvoker} lets a migrated Effect program pose as a legacy `CommandInvoker`, so an
 * unmigrated caller composes it unchanged. Cancellation flows from `AbortSignal`s into fiber
 * interruption, and every scope finalizer completes before the returned promise settles.
 * {@link legacyReadOnlyFiles}, {@link legacyFileSystem}, and {@link legacyTaskScheduler} go the
 * other way for the shared Promise helpers (`resolveRepositoryPaths`, `loadRepositoryRequirements`,
 * `readToolingConfig`, `writeToolingConfig`) that cohort 7 converts: they hand those helpers
 * legacy-shaped capabilities backed by the Effect services, preserving the legacy error `code`s
 * the helpers branch on. {@link createLegacyInspectionRuntime} is the legacy Promise view of the
 * Effect `Inspection` service that the legacy command scopes expose as `runtime.inspection`.
 * {@link runEffectOrThrow} runs an Effect program for a still-legacy container command over that
 * invocation's own runner, filesystem, environment, and logger ({@link legacyRuntimeLayer}); it is
 * deleted in cohort 6 once those commands are Effect-native. The
 * bridge exists only while both command models coexist and is deleted in cohort 7.
 */

import {join} from "node:path";

import {
  Cause,
  Context,
  Duration,
  Effect,
  Exit,
  Fiber,
  FileSystem,
  Formatter,
  Layer,
  Logger,
  ManagedRuntime,
  Option,
  PlatformError,
  References,
  Result,
  Scope,
  type Path,
} from "effect";

import type {CommandExecution, CommandInvocationOptions, CommandInvoker, CommandPresentation} from "../common/commander.ts";
import type {MonorepositoryLogger} from "../common/logger.ts";
import type {ProcessOutcome as LegacyProcessOutcome, ProcessRunOptions as LegacyProcessRunOptions} from "../common/runner.ts";
import {
  commandCancellationFromSignal,
  DefaultTaskScheduler,
  FILE_SYSTEM_MAX_BYTES_EXCEEDED_CODE,
  FileSystemError,
  linkAbortSignals,
  type CommandRuntime,
  type DirectoryEntry,
  type FileMetadata,
  type FileSystem as LegacyFileSystem,
  type ReadOnlyFileSystem as LegacyReadOnlyFileSystem,
  type TaskScheduler,
} from "../common/runtime.ts";
import type {ContainerEngine} from "../container-runtime/types.ts";
import {Inspection} from "../inspection/Inspection.ts";
import {
  equivalentRepositoryInspectionRequests,
  repositoryInspectionConflictMessage,
  repositoryInspectionRequestKey,
  type RepositoryInspectionFacts,
  type RepositoryInspectionKey,
  type RepositoryInspectionRequest,
  type RepositoryInspectionSession,
} from "../inspection/repository.ts";
import type {InspectionOutcome} from "../inspection/types.ts";
import {Environment, EnvironmentLive, layerEnvironment} from "./Environment.ts";
import {MaxBytesExceeded, ReadOnlyFiles, ReadOnlyFilesLive, writeTextAtomic, type Glob} from "./Files.ts";
import {commandLayer, makeNodeLayer, NodeBaseLayer, type PlatformServices} from "./layers.ts";
import {resolveColor, Sink, StdoutIsTTY, type OutputSettingsShape} from "./Output.ts";
import {
  formatProcessRequest,
  MAX_EVIDENCE_CHARACTERS,
  Process,
  processErrorEvidence,
  ProcessExited,
  ProcessLayerFactory,
  ProcessSignalled,
  ProcessSpawnFailed,
  ProcessTimedOut,
  type ProcessError,
  type ProcessOptions,
  type ProcessRequest,
  type ProcessResult,
} from "./Process.ts";

/** Builds the platform layer for one bridged invocation from its output settings. */
export type LayerFactory = (settings: OutputSettingsShape) => Layer.Layer<PlatformServices>;

/** Options of one {@link runEffect} invocation. */
export interface RunEffectOptions {
  /** Output mode of the invocation. */
  readonly presentation: CommandPresentation;
  /** Whether debug logs are emitted. */
  readonly verbose: boolean;
  /** Default `[arolariu::<context>]` log prefix context. */
  readonly context: string;
  /** Aborting it interrupts the program; finalizers complete before the promise settles. */
  readonly signal?: AbortSignal;
  /** Builds the platform layer; defaults to `makeNodeLayer`. */
  readonly makeLayer?: LayerFactory;
}

/**
 * Runs an Effect program from legacy Promise code with a freshly built platform layer.
 *
 * @remarks
 * The layer is built from `{mode: presentation, verbose, color, context}`, where `color` follows
 * `resolveColor` over the ambient Node environment snapshot (`EnvironmentLive`). The program runs
 * in its own scope; aborting `signal` interrupts it and the promise settles only after every
 * finalizer has run.
 *
 * @param program - The program to run; it may require any platform service and a scope.
 * @param options - Output settings, cancellation signal, and optional layer factory.
 * @returns A promise of the program exit; it never rejects for typed failures, defects, or interruption.
 */
export function runEffect<A, E>(
  program: Effect.Effect<A, E, PlatformServices | Scope.Scope>,
  options: RunEffectOptions,
): Promise<Exit.Exit<A, E>> {
  const makeLayer = options.makeLayer ?? makeNodeLayer;
  const runnable = Effect.gen(function* () {
    const environment = yield* Environment;
    const layer = makeLayer({
      mode: options.presentation,
      verbose: options.verbose,
      color: resolveColor(environment),
      context: options.context,
    });
    return yield* program.pipe(Effect.scoped, Effect.provide(layer));
  }).pipe(Effect.provide(EnvironmentLive));
  return Effect.runPromiseExit(runnable, {signal: options.signal});
}

/**
 * Narrows an unknown failure to a {@link ProcessError}.
 *
 * @param error - The failure value.
 * @returns Whether `error` is one of the `Process.run` failure classes.
 */
function isProcessError(error: unknown): error is ProcessError {
  return (
    error instanceof ProcessExited
    || error instanceof ProcessSignalled
    || error instanceof ProcessSpawnFailed
    || error instanceof ProcessTimedOut
  );
}

/**
 * Reads the human-readable message of a failure value.
 *
 * @param error - The failure value.
 * @returns `error.message` when it is a string, otherwise `String(error)`.
 */
function messageOf(error: unknown): string {
  if (typeof error === "object" && error !== null && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return String(error);
}

/**
 * Reads the legacy `verbose` flag from a command input, when the input declares one.
 *
 * @param input - The command input.
 * @returns `true` only when `input.verbose` is exactly `true`.
 */
function verboseOf(input: unknown): boolean {
  return typeof input === "object" && input !== null && "verbose" in input && input.verbose === true;
}

/**
 * Collects the messages of every typed failure and defect in a cause.
 *
 * @param cause - The failure cause.
 * @returns One message per `Fail` or `Die` reason, in cause order; interruptions are skipped.
 */
function failureMessages(cause: Cause.Cause<unknown>): readonly string[] {
  return cause.reasons.flatMap((reason) => {
    if (Cause.isFailReason(reason)) {
      return [messageOf(reason.error)];
    }
    return Cause.isDieReason(reason) ? [messageOf(reason.defect)] : [];
  });
}

/**
 * Maps an Effect program exit to the legacy {@link CommandExecution} shape.
 *
 * @remarks
 * An interrupted exit whose `signal` aborted is cancelled with the legacy
 * `commandCancellationFromSignal` reason (so a `SIGTERM` cancellation keeps `143`), even when
 * finalizers also failed; their messages become the evidence.
 *
 * @param exit - The program exit.
 * @param exitCodeOf - Business exit code of a successful output.
 * @param signal - The linked invocation signal.
 * @returns The equivalent legacy execution.
 */
function toExecution<TOutput, E>(
  exit: Exit.Exit<TOutput, E>,
  exitCodeOf: (output: Readonly<TOutput>) => 0 | 1,
  signal: AbortSignal,
): CommandExecution<TOutput> {
  if (Exit.isSuccess(exit)) {
    return {status: "completed", value: exit.value, exitCode: exitCodeOf(exit.value)};
  }
  const {cause} = exit;
  if (signal.aborted && Cause.hasInterrupts(cause)) {
    const cancellation = commandCancellationFromSignal(signal);
    return {
      status: "cancelled",
      exitCode: cancellation.exitCode,
      failure: {kind: "cancelled", message: cancellation.message, evidence: failureMessages(cause), cause: cancellation},
    };
  }
  if (Cause.hasInterruptsOnly(cause)) {
    return {status: "cancelled", exitCode: 130, failure: {kind: "cancelled", message: "Command cancelled.", evidence: []}};
  }
  const failure = Cause.findError(cause);
  const isTyped = Result.isSuccess(failure);
  const error: unknown = isTyped ? failure.success : Cause.squash(cause);
  return {
    status: "failed",
    exitCode: 1,
    failure: {
      kind: isTyped ? "operational" : "internal",
      message: messageOf(error),
      evidence: isProcessError(error) ? processErrorEvidence(error) : [],
      cause: error,
    },
  };
}

/**
 * Wraps a migrated Effect program as a legacy {@link CommandInvoker}.
 *
 * @remarks
 * `invoke(input, options)` runs `program(input)` through {@link runEffect} with presentation
 * `options.presentation ?? "silent"`, `verbose` taken from `input.verbose === true`, and a signal
 * linked from the parent runtime signal and `options.signal`. Success maps to `completed` with
 * `exitCodeOf(value)`; an interruption after the linked signal aborted to `cancelled` with the
 * signal's `CommandCancellation` (its exit code, message, and `cause`; any failure messages in the
 * cause as evidence); any other interruption-only exit to `cancelled` (`130`); a typed failure to an
 * `operational` failure (`1`, with process evidence for a `ProcessError`); any other cause to an
 * `internal` failure (`1`).
 *
 * @param context - Default `[arolariu::<context>]` log prefix context.
 * @param program - Builds the program for one input.
 * @param exitCodeOf - Business exit code of a successful output.
 * @param makeLayer - Builds the platform layer; defaults to `makeNodeLayer`.
 * @returns An invoker whose `invoke` never rejects.
 */
export function legacyInvoker<TInput, TOutput, E>(
  context: string,
  program: (input: Readonly<TInput>) => Effect.Effect<TOutput, E, PlatformServices | Scope.Scope>,
  exitCodeOf: (output: Readonly<TOutput>) => 0 | 1,
  makeLayer?: LayerFactory,
): CommandInvoker<TInput, TOutput> {
  return {
    invoke: async (input: Readonly<TInput>, options: Readonly<CommandInvocationOptions> = {}): Promise<CommandExecution<TOutput>> => {
      const link = linkAbortSignals(options.parent?.runtime.signal, options.signal);
      try {
        const exit = await runEffect(
          Effect.suspend(() => program(input)),
          {
            presentation: options.presentation ?? "silent",
            verbose: verboseOf(input),
            context,
            signal: link.signal,
            ...(makeLayer === undefined ? {} : {makeLayer}),
          },
        );
        return toExecution(exit, exitCodeOf, link.signal);
      } finally {
        link.dispose();
      }
    },
  };
}

/** Legacy error code of each platform failure reason, used when the failure carries no Node `code`. */
const LEGACY_ERROR_CODES: Readonly<Record<string, string>> = {
  NotFound: "ENOENT",
  PermissionDenied: "EACCES",
  AlreadyExists: "EEXIST",
  BadResource: "EBADF",
  Busy: "EBUSY",
  InvalidData: "EINVAL",
  TimedOut: "ETIMEDOUT",
  UnexpectedEof: "EOF",
  Unknown: "EUNKNOWN",
  BadArgument: "EINVAL",
};

/**
 * Reads the Node error `code` of a failure cause, when it carries one.
 *
 * @param cause - The underlying failure.
 * @returns The string `code`, or `undefined`.
 */
function nodeErrorCode(cause: unknown): string | undefined {
  if (typeof cause !== "object" || cause === null || !("code" in cause)) {
    return undefined;
  }
  return typeof cause.code === "string" ? cause.code : undefined;
}

/**
 * Converts an Effect filesystem failure into the legacy code-preserving {@link FileSystemError}.
 *
 * @remarks
 * The code is the underlying Node `code` when the platform failure's cause carries one (the live
 * Node filesystem always does). Otherwise the reason maps to a legacy code: `NotFound` → `ENOENT`,
 * `PermissionDenied` → `EACCES`, `AlreadyExists` → `EEXIST`, `BadResource` → `EBADF`, `Busy` →
 * `EBUSY`, `InvalidData` and `BadArgument` → `EINVAL`, `TimedOut` → `ETIMEDOUT`, `UnexpectedEof` →
 * `EOF`, and every other reason → `EUNKNOWN`. {@link MaxBytesExceeded} maps to
 * {@link FILE_SYSTEM_MAX_BYTES_EXCEEDED_CODE} with its own message, as the legacy bounded read does.
 *
 * @param error - The Effect failure.
 * @param path - The path the failing operation targeted.
 * @param operation - The legacy operation name; defaults to the platform method (or `readBytes`).
 * @returns The equivalent legacy error, with `error` as its `cause`.
 */
export function toLegacyFileSystemError(
  error: PlatformError.PlatformError | MaxBytesExceeded,
  path: string,
  operation?: string,
): FileSystemError {
  if (error._tag === "MaxBytesExceeded") {
    return new FileSystemError(operation ?? "readBytes", path, error.message, {code: FILE_SYSTEM_MAX_BYTES_EXCEEDED_CODE, cause: error});
  }
  const failedOperation = operation ?? error.reason.method;
  const code = nodeErrorCode(error.reason.cause) ?? LEGACY_ERROR_CODES[error.reason._tag] ?? "EUNKNOWN";
  return new FileSystemError(failedOperation, path, `Failed to ${failedOperation} '${path}': ${error.message}`, {code, cause: error});
}

/** Runs one filesystem effect as a legacy promise that rejects with a {@link FileSystemError}. */
type LegacyFileRunner<R> = <A>(
  operation: string,
  path: string,
  effect: Effect.Effect<A, PlatformError.PlatformError | MaxBytesExceeded, R>,
) => Promise<A>;

/**
 * Builds a {@link LegacyFileRunner} over a captured context.
 *
 * @param context - The services every call runs with.
 * @returns The runner.
 */
function legacyFileRunner<R>(context: Context.Context<R>): LegacyFileRunner<R> {
  const run = Effect.runPromiseWith(context);
  return (operation, path, effect) => run(Effect.mapError(effect, (error) => toLegacyFileSystemError(error, path, operation)));
}

/**
 * Classifies a stat result as a legacy entry kind.
 *
 * @param info - The stat result.
 * @returns `file`, `directory`, or `other`.
 */
function legacyKind(info: FileSystem.File.Info): DirectoryEntry["kind"] {
  if (info.type === "File") {
    return "file";
  }
  return info.type === "Directory" ? "directory" : "other";
}

/**
 * Builds the legacy read-only view over the Effect {@link ReadOnlyFiles} service.
 *
 * @param files - The Effect read-only service.
 * @param run - Runs each call with the captured context.
 * @returns The legacy view.
 */
function readOnlyView<R>(files: ReadOnlyFiles["Service"], run: LegacyFileRunner<R>): LegacyReadOnlyFileSystem {
  return {
    readText: (path) => run("readText", path, files.readFileString(path)),
    readBytes: (path, options = {}) => {
      const {maximumBytes} = options;
      if (maximumBytes === undefined) {
        return run("readBytes", path, files.readFile(path));
      }
      if (!Number.isSafeInteger(maximumBytes) || maximumBytes < 0) {
        return Promise.reject(new RangeError("maximumBytes must be a non-negative safe integer."));
      }
      return run("readBytes", path, files.readBytesBounded(path, maximumBytes));
    },
    exists: (path) => run("exists", path, files.exists(path)),
    assertAccessible: (path, access = {}) => {
      if (access.execute === true) {
        // The Effect FileSystem cannot check execute permission; fail loudly instead of guessing.
        return Promise.reject(
          new FileSystemError("assertAccessible", path, `Failed to assertAccessible '${path}': execute access cannot be checked.`, {
            code: "ENOTSUP",
          }),
        );
      }
      return run("assertAccessible", path, files.access(path, {readable: access.read, writable: access.write}));
    },
    realPath: (path) => run("realPath", path, files.realPath(path)),
    inspect: (path) =>
      run(
        "inspect",
        path,
        files.stat(path).pipe(
          Effect.map((info): FileMetadata => {
            const modifiedAt = Option.getOrUndefined(info.mtime);
            return {
              kind: legacyKind(info),
              size: Number(info.size),
              mode: info.mode,
              ...(modifiedAt === undefined ? {} : {modifiedAt}),
            };
          }),
          Effect.catchIf(
            (error) => error.reason._tag === "NotFound",
            () => Effect.succeed<FileMetadata>({kind: "missing", size: 0}),
          ),
        ),
      ),
    readDirectory: (path) =>
      run(
        "readDirectory",
        path,
        Effect.flatMap(files.readDirectory(path), (names) =>
          Effect.forEach(
            names,
            (name) =>
              files.stat(join(path, name)).pipe(
                Effect.map((info): DirectoryEntry => ({name, kind: legacyKind(info)})),
                // A dangling link has no stat target; the legacy Dirent reports it as neither file nor directory.
                Effect.orElseSucceed((): DirectoryEntry => ({name, kind: "other"})),
              ),
            {concurrency: "unbounded"},
          ),
        ),
      ),
    glob: (patterns, options = {}) => run("glob", options.cwd ?? ".", files.glob(patterns, options)),
  };
}

/**
 * Legacy read-only filesystem view over the Effect {@link ReadOnlyFiles} service.
 *
 * @remarks
 * Captures the current context and runs each call with `Effect.runPromiseWith(context)`, so a
 * shared Promise helper (for example `resolveRepositoryPaths`) reads through the same in-memory or
 * Node service as the calling Effect program. Failures reject with a {@link FileSystemError} whose
 * `code` follows {@link toLegacyFileSystemError}; an invalid `maximumBytes` rejects with a
 * `RangeError` and an `execute` access check with code `ENOTSUP`, because the Effect `FileSystem`
 * cannot check execute permission. Deleted in cohort 7.
 */
export const legacyReadOnlyFiles: Effect.Effect<LegacyReadOnlyFileSystem, never, ReadOnlyFiles> = Effect.gen(function* () {
  const context = yield* Effect.context<ReadOnlyFiles>();
  const files = yield* ReadOnlyFiles;
  return readOnlyView(files, legacyFileRunner(context));
});

/**
 * Legacy mutating filesystem view over the Effect `FileSystem`, `Path`, `Glob`, and
 * {@link ReadOnlyFiles} services.
 *
 * @remarks
 * Extends {@link legacyReadOnlyFiles} with the mutating members, run the same way:
 * `writeTextAtomic` is the platform {@link writeTextAtomic}; `copy` keeps the legacy defaults
 * (`force: true`, and a directory source requires `recursive: true`, failing with
 * `ERR_FS_EISDIR` otherwise); `createTemporaryDirectory` creates a directory under the platform
 * temporary root whose `remove` deletes it recursively. Deleted in cohort 7.
 */
export const legacyFileSystem: Effect.Effect<LegacyFileSystem, never, FileSystem.FileSystem | Path.Path | Glob | ReadOnlyFiles> =
  Effect.gen(function* () {
    const context = yield* Effect.context<FileSystem.FileSystem | Path.Path | Glob | ReadOnlyFiles>();
    const fs = yield* FileSystem.FileSystem;
    const run = legacyFileRunner(context);
    return {
      ...readOnlyView(yield* ReadOnlyFiles, run),
      createDirectory: (path, options = {}) =>
        run(
          "createDirectory",
          path,
          fs.makeDirectory(path, {recursive: options.recursive ?? false, ...(options.mode === undefined ? {} : {mode: options.mode})}),
        ),
      writeText: (path, contents, options = {}) =>
        run(
          "writeText",
          path,
          fs.writeFileString(path, contents, {
            flag: options.exclusive === true ? "wx" : "w",
            ...(options.mode === undefined ? {} : {mode: options.mode}),
          }),
        ),
      writeBytes: (path, contents, options = {}) =>
        run(
          "writeBytes",
          path,
          fs.writeFile(path, contents, {
            flag: options.exclusive === true ? "wx" : "w",
            ...(options.mode === undefined ? {} : {mode: options.mode}),
          }),
        ),
      writeTextAtomic: (path, contents, options = {}) => run("writeTextAtomic", path, writeTextAtomic(path, contents, options)),
      copy: (source, destination, options = {}) =>
        run(
          "copy",
          source,
          Effect.gen(function* () {
            if (options.recursive !== true && (yield* fs.stat(source)).type === "Directory") {
              const cause = Object.assign(new Error("Recursive option is required to copy a directory"), {code: "ERR_FS_EISDIR"});
              return yield* Effect.fail(
                PlatformError.systemError({
                  _tag: "BadResource",
                  module: "FileSystem",
                  method: "copy",
                  pathOrDescriptor: source,
                  description: cause.message,
                  cause,
                }),
              );
            }
            yield* fs.copy(source, destination, {overwrite: options.force ?? true});
          }),
        ),
      move: (source, destination) => run("move", source, fs.rename(source, destination)),
      remove: (path, options = {}) =>
        run("remove", path, fs.remove(path, {recursive: options.recursive ?? false, force: options.force ?? false})),
      createTemporaryDirectory: (prefix) =>
        run(
          "createTemporaryDirectory",
          prefix,
          Effect.map(fs.makeTempDirectory({prefix}), (path) => ({
            path,
            remove: () => run("createTemporaryDirectory.remove", path, fs.remove(path, {recursive: true, force: true})),
          })),
        ),
      setMode: (path, mode) => run("setMode", path, fs.chmod(path, mode)),
    };
  });

/**
 * The shared legacy task scheduler handed to shared Promise helpers (for example
 * `loadRepositoryRequirements`), so migrated families never value-import the legacy kernel.
 * Deleted in cohort 7.
 */
export const legacyTaskScheduler: TaskScheduler = new DefaultTaskScheduler();

/** Legacy Promise view of one repository inspection session. Deleted in cohort 7. */
export interface LegacyRepositoryInspectionSession {
  /** Resolves the memoized outcome of one fact. */
  readonly inspect: <K extends RepositoryInspectionKey>(key: K) => Promise<InspectionOutcome<RepositoryInspectionFacts[K]>>;
  /** Forgets the cached outcomes of exactly `keys`; takes effect before any later `inspect`. */
  readonly invalidate: (...keys: readonly RepositoryInspectionKey[]) => void;
  /** Sets the engine the next `"infrastructure"` run observes; takes effect before any later `inspect`. */
  readonly updateInfrastructureEngine: (engine: ContainerEngine) => void;
}

/** Legacy Promise view of the `Inspection` service. Deleted in cohort 7. */
export interface LegacyRepositoryInspectionRuntime {
  /** Returns the shared session for `request`, creating it on first use. */
  readonly getRepositorySession: (request: Readonly<RepositoryInspectionRequest>) => LegacyRepositoryInspectionSession;
}

/** Options of {@link createLegacyInspectionRuntime}. */
export interface LegacyInspectionRuntimeOptions {
  /** Owning invocation signal; once aborted, `inspect` rejects with its `CommandCancellation`. */
  readonly signal?: AbortSignal;
}

/**
 * Creates the legacy Promise inspection runtime the legacy command scopes expose, backed by the
 * Effect `Inspection` service.
 *
 * @remarks
 * One `ManagedRuntime` over `makeLayer({mode: "silent", verbose: false, color: false, context:
 * "inspection"})` serves every session; it is built on the first `inspect`. `getRepositorySession`
 * is synchronous: it memoizes sessions by `repositoryInspectionRequestKey` and throws the legacy
 * conflicting-request error for an equal key with a different request. Each session resolves its
 * Effect session lazily, then applies every call in call order (each `inspect` fiber starts
 * synchronously), so an `invalidate` or `updateInfrastructureEngine` affects every later `inspect`.
 * Once `signal` aborts, `inspect` rejects with `commandCancellationFromSignal(signal)`; `dispose`
 * closes the runtime, which interrupts every in-flight provider. Deleted in cohort 7.
 *
 * @param makeLayer - Builds the platform layer; defaults to `makeNodeLayer`.
 * @param options - The owning invocation signal.
 * @returns The runtime and its `dispose`.
 */
export function createLegacyInspectionRuntime(
  makeLayer: LayerFactory = makeNodeLayer,
  options: LegacyInspectionRuntimeOptions = {},
): LegacyRepositoryInspectionRuntime & {readonly dispose: () => Promise<void>} {
  const {signal} = options;
  const runtime = ManagedRuntime.make(makeLayer({mode: "silent", verbose: false, color: false, context: "inspection"}));
  const sessions = new Map<
    string,
    {readonly request: Readonly<RepositoryInspectionRequest>; readonly session: LegacyRepositoryInspectionSession}
  >();

  const throwIfCancelled = (): void => {
    if (signal?.aborted === true) {
      throw commandCancellationFromSignal(signal);
    }
  };
  const cancellable = async <A>(operation: () => Promise<A>): Promise<A> => {
    throwIfCancelled();
    try {
      return await operation();
    } catch (error) {
      throwIfCancelled();
      throw error;
    }
  };

  const createSession = (request: Readonly<RepositoryInspectionRequest>): LegacyRepositoryInspectionSession => {
    let resolved: Promise<RepositoryInspectionSession> | undefined;
    const ready = (): Promise<RepositoryInspectionSession> =>
      (resolved ??= runtime.runPromise(
        Effect.gen(function* () {
          const inspection = yield* Inspection;
          return yield* inspection.session(request);
        }),
      ));
    const apply = (operation: (session: RepositoryInspectionSession) => Effect.Effect<void>): void => {
      // Settles in call order with every other operation of this session; a failed resolution surfaces on `inspect`.
      ready().then(
        (session) => {
          runtime.runSync(operation(session));
        },
        () => undefined,
      );
    };
    return {
      inspect: (key) =>
        cancellable(() =>
          ready().then((session) => {
            const fiber = runtime.runFork(session.inspect(key), signal === undefined ? undefined : {signal});
            return Effect.runPromise(Fiber.join(fiber));
          }),
        ),
      invalidate: (...keys) => {
        apply((session) => session.invalidate(...keys));
      },
      updateInfrastructureEngine: (engine) => {
        apply((session) => session.updateInfrastructureEngine(engine));
      },
    };
  };

  return {
    getRepositorySession: (request) => {
      const key = repositoryInspectionRequestKey(request);
      const existing = sessions.get(key);
      if (existing !== undefined) {
        if (!equivalentRepositoryInspectionRequests(existing.request, request)) {
          throw new Error(repositoryInspectionConflictMessage(key));
        }
        return existing.session;
      }
      const session = createSession(request);
      sessions.set(key, {request, session});
      return session;
    },
    dispose: () => runtime.dispose(),
  };
}

/** Platform failure reason of each legacy filesystem error code; every other code maps to `Unknown`. */
const PLATFORM_REASONS: Readonly<Record<string, PlatformError.SystemErrorTag>> = {
  ENOENT: "NotFound",
  EACCES: "PermissionDenied",
  EPERM: "PermissionDenied",
  EEXIST: "AlreadyExists",
  EBADF: "BadResource",
  EBUSY: "Busy",
  EINVAL: "InvalidData",
  ETIMEDOUT: "TimedOut",
  EOF: "UnexpectedEof",
};

/**
 * Converts a legacy filesystem rejection into a platform failure.
 *
 * @remarks
 * The reason follows the legacy error `code` ({@link PLATFORM_REASONS}); the legacy error stays the
 * cause, so {@link toLegacyFileSystemError} recovers the same `code` on the way back.
 *
 * @param error - The legacy rejection.
 * @param method - The platform method that failed.
 * @param path - The path the operation targeted.
 * @returns The equivalent platform failure.
 */
function fromLegacyFileSystemError(error: unknown, method: string, path: string): PlatformError.PlatformError {
  const code = nodeErrorCode(error);
  return PlatformError.systemError({
    _tag: (code === undefined ? undefined : PLATFORM_REASONS[code]) ?? "Unknown",
    module: "FileSystem",
    method,
    pathOrDescriptor: path,
    description: messageOf(error),
    cause: error,
  });
}

/**
 * Builds the Effect `FileSystem` a legacy-runtime program reads and removes files through.
 *
 * @remarks
 * Only `exists`, `readFile`, `readFileString`, and `remove` delegate to the legacy filesystem (the
 * members the container selection and Traefik removal use); every other member behaves as
 * `FileSystem.makeNoop`. `remove` forwards only the options that were set. Deleted with
 * {@link runEffectOrThrow}.
 *
 * @param files - The legacy invocation filesystem.
 * @returns The delegating filesystem.
 */
function legacyBackedFileSystem(files: LegacyFileSystem): FileSystem.FileSystem {
  const attempt = <A>(method: string, path: string, run: () => Promise<A>): Effect.Effect<A, PlatformError.PlatformError> =>
    Effect.tryPromise({try: run, catch: (error) => fromLegacyFileSystemError(error, method, path)});
  return FileSystem.makeNoop({
    exists: (path) => attempt("exists", path, () => files.exists(path)),
    readFile: (path) => attempt("readFile", path, () => files.readBytes(path)),
    readFileString: (path) => attempt("readFileString", path, () => files.readText(path)),
    remove: (path, options) =>
      attempt("remove", path, () =>
        files.remove(
          path,
          options === undefined
            ? undefined
            : {
                ...(options.recursive === undefined ? {} : {recursive: options.recursive}),
                ...(options.force === undefined ? {} : {force: options.force}),
              },
        ),
      ),
  });
}

/**
 * Maps `Process` options onto the legacy runner options of one legacy-runtime invocation.
 *
 * @remarks
 * The invocation signal is always set; `cwd`, `env`, `output`, `input`, and `timeout` (as
 * `timeoutMs`) are copied only when supplied, so a bare probe runs with exactly `{signal}`. `tee`
 * output and `echo: true` hand the runner the invocation logger, and `echo: true` turns on its
 * command echo.
 *
 * @param runtime - The legacy invocation runtime.
 * @param options - The `Process.run` options.
 * @returns The legacy runner options.
 */
function legacyRunOptions(runtime: CommandRuntime, options: ProcessOptions): LegacyProcessRunOptions {
  return {
    signal: runtime.signal,
    ...(options.cwd === undefined ? {} : {cwd: options.cwd}),
    ...(options.env === undefined ? {} : {env: options.env}),
    ...(options.output === undefined ? {} : {output: options.output}),
    ...(options.input === undefined ? {} : {input: options.input}),
    ...(options.timeout === undefined ? {} : {timeoutMs: Duration.toMillis(options.timeout)}),
    ...(options.output === "tee" || options.echo === true ? {logger: runtime.logger} : {}),
    ...(options.echo === true ? {logCommands: true} : {}),
  };
}

/**
 * Converts a legacy process outcome into the `Process.run` result or failure it stands for.
 *
 * @remarks
 * Mirrors the harness `processOutcomeEffect`: a spawn failure's legacy `message` becomes the
 * failure `reason`. Captured output is kept whole for `failureOutput: "full"` and otherwise trimmed
 * to the last {@link MAX_EVIDENCE_CHARACTERS} characters, as `ProcessLive` does. A `cancelled`
 * outcome interrupts when the invocation signal is aborted (the invocation's own cancellation) and
 * otherwise fails as a {@link ProcessSignalled} (`SIGTERM` unless the outcome names a signal).
 *
 * @param request - The answered request.
 * @param outcome - The legacy outcome.
 * @param options - The `Process.run` options.
 * @param signal - The invocation signal.
 * @returns The equivalent process effect.
 */
function fromLegacyOutcome(
  request: ProcessRequest,
  outcome: LegacyProcessOutcome,
  options: ProcessOptions,
  signal: AbortSignal,
): Effect.Effect<ProcessResult, ProcessError> {
  if (outcome.kind === "succeeded") {
    return Effect.succeed({stdout: outcome.stdout, stderr: outcome.stderr, durationMs: outcome.durationMs});
  }
  if (outcome.kind === "cancelled" && signal.aborted) {
    return Effect.interrupt;
  }
  const command = formatProcessRequest(request);
  const evidence = (text: string): string =>
    options.failureOutput === "full" || text.length <= MAX_EVIDENCE_CHARACTERS ? text : text.slice(-MAX_EVIDENCE_CHARACTERS);
  const base = {command, stdout: evidence(outcome.stdout), stderr: evidence(outcome.stderr), durationMs: outcome.durationMs};
  switch (outcome.kind) {
    case "exited":
      return Effect.fail(
        new ProcessExited({...base, exitCode: outcome.exitCode, message: `${command} exited with code ${String(outcome.exitCode)}`}),
      );
    case "signalled":
      return Effect.fail(
        new ProcessSignalled({...base, signal: outcome.signal, message: `${command} was terminated by ${outcome.signal}`}),
      );
    case "spawn-failed":
      return Effect.fail(
        new ProcessSpawnFailed({...base, reason: outcome.message, message: `${command} failed to start: ${outcome.message}`}),
      );
    case "timed-out": {
      const timeoutMs = options.timeout === undefined ? 0 : Duration.toMillis(options.timeout);
      return Effect.fail(new ProcessTimedOut({...base, timeoutMs, message: `${command} timed out after ${String(timeoutMs)} ms`}));
    }
    case "cancelled": {
      const terminatedBy = outcome.signal ?? "SIGTERM";
      return Effect.fail(new ProcessSignalled({...base, signal: terminatedBy, message: `${command} was cancelled`}));
    }
  }
}

/**
 * Builds the `Process` layer that runs every request through a legacy runtime's runner.
 *
 * @param runtime - The legacy invocation runtime.
 * @returns A layer whose `run` calls `runtime.runner.run` with {@link legacyRunOptions} and maps the
 * outcome with {@link fromLegacyOutcome}.
 */
function legacyProcessLayer(runtime: CommandRuntime): Layer.Layer<Process> {
  return Layer.succeed(
    Process,
    Process.of({
      run: (request, options = {}) =>
        Effect.flatMap(
          Effect.promise(() => runtime.runner.run(request, legacyRunOptions(runtime, options))),
          (outcome) => fromLegacyOutcome(request, outcome, options, runtime.signal),
        ),
    }),
  );
}

/**
 * Builds the Effect logger that forwards every log line to a legacy invocation logger.
 *
 * @remarks
 * The message is rendered like the platform logger (parts joined by spaces, a non-empty cause
 * appended with `Cause.pretty`). A string `context` log annotation (`withLogContext`) selects the
 * legacy child logger `logger.child(context)`, so `[arolariu::<command>::<context>]` keeps its legacy
 * prefix; without one the line goes to `logger` itself. `Trace`/`Debug` map to `debug`, `Warn` to
 * `warn`, `Error`/`Fatal` to `error`, and every other level to `info`; the legacy logger applies the
 * invocation's presentation and verbosity.
 *
 * @param logger - The legacy invocation logger.
 * @returns The forwarding logger.
 */
function legacyLogger(logger: MonorepositoryLogger): Logger.Logger<unknown, void> {
  return Logger.make<unknown, void>((options) => {
    const parts: readonly unknown[] = Array.isArray(options.message) ? options.message : [options.message];
    let message = parts.map((part) => (typeof part === "string" ? part : Formatter.format(part))).join(" ");
    if (options.cause.reasons.length > 0) {
      message += `\n${Cause.pretty(options.cause)}`;
    }
    const context = options.fiber.getRef(References.CurrentLogAnnotations)["context"];
    const target = typeof context === "string" ? logger.child(context) : logger;
    switch (options.logLevel) {
      case "Trace":
      case "Debug":
        target.debug(message);
        return;
      case "Warn":
        target.warn(message);
        return;
      case "Error":
      case "Fatal":
        target.error(message);
        return;
      default:
        target.info(message);
    }
  });
}

/**
 * Builds the platform layer of a program run on behalf of a legacy command invocation.
 *
 * @remarks
 * The Node layer with the invocation's own capabilities in place of the ambient ones: `Process` runs
 * through `runtime.runner` ({@link legacyProcessLayer}), `Environment` is `runtime.environment`,
 * `FileSystem` and `ReadOnlyFiles` read (and remove) through `runtime.files`
 * ({@link legacyBackedFileSystem}), every log line goes to `runtime.logger` ({@link legacyLogger},
 * minimum level `Debug`), and the `Sink` writes presenter output through `runtime.logger.write`. So
 * the program observes the same fakes as the legacy command under test, and every byte it renders
 * honors the invocation's legacy presentation. Deleted with {@link runEffectOrThrow}.
 *
 * @param runtime - The legacy invocation runtime.
 * @returns The layer factory.
 */
function legacyRuntimeLayer(runtime: CommandRuntime): LayerFactory {
  return (settings) => {
    // `fresh`: NodeBaseLayer builds the same ReadOnlyFilesLive over the Node filesystem, and the layer memo map would reuse it.
    const overrides = Layer.fresh(ReadOnlyFilesLive).pipe(
      Layer.provideMerge(
        Layer.mergeAll(
          Layer.succeed(FileSystem.FileSystem, legacyBackedFileSystem(runtime.files)),
          layerEnvironment(runtime.environment),
          Layer.succeed(Sink, {write: (record) => Effect.sync(() => runtime.logger.write(record.text, record.stream))}),
          Layer.succeed(StdoutIsTTY, false),
          Layer.succeed(ProcessLayerFactory, legacyProcessLayer(runtime)),
        ),
      ),
    );
    const platform = commandLayer(settings).pipe(Layer.provideMerge(overrides), Layer.provideMerge(NodeBaseLayer));
    return Layer.mergeAll(Logger.layer([legacyLogger(runtime.logger)]), Layer.succeed(References.MinimumLogLevel, "Debug")).pipe(
      Layer.provideMerge(platform),
    );
  };
}

/**
 * Runs an Effect program from a legacy command and returns its value, throwing on failure.
 *
 * @remarks
 * Temporary helper for the legacy container commands (`aspire`, `compose`, `image`, `selfhost`)
 * while they call the converted container helpers; each call site carries a `// cohort 6 temporary`
 * comment, and Tasks 6.3 and 6.4 delete them. The program runs through {@link runEffect} with
 * context `"containers"` and the {@link legacyRuntimeLayer} of `runtime`.
 * That layer renders every log line and presenter write through `runtime.logger`, which already
 * carries the invocation's presentation and verbosity, so the Effect side runs in `"human"` mode
 * with `verbose: false` and never filters output on its own. `runtime.signal` is deliberately not
 * turned into fiber interruption: the legacy runner already observes it on every process call, and a
 * call it reports `cancelled` on the aborted signal interrupts the program there, exactly where the
 * legacy command stopped (a pre-aborted signal still lets the legacy fakes answer earlier calls).
 * An interruption after `runtime.signal` aborted throws the signal's `CommandCancellation` (keeping
 * `130`/`143`); any other failure throws `Cause.squash(exit.cause)`, so a typed failure rejects with
 * the original error value.
 *
 * @param program - The program to run; it may require any platform service and a scope.
 * @param runtime - The legacy invocation runtime.
 * @returns The program value.
 * @throws The invocation's `CommandCancellation` or the squashed failure cause.
 */
export async function runEffectOrThrow<A, E>(
  program: Effect.Effect<A, E, PlatformServices | Scope.Scope>,
  runtime: CommandRuntime,
): Promise<A> {
  const exit = await runEffect(program, {
    presentation: "human",
    verbose: false,
    context: "containers",
    makeLayer: legacyRuntimeLayer(runtime),
  });
  if (Exit.isSuccess(exit)) {
    return exit.value;
  }
  if (runtime.signal.aborted && Cause.hasInterrupts(exit.cause)) {
    throw commandCancellationFromSignal(runtime.signal);
  }
  throw Cause.squash(exit.cause);
}
