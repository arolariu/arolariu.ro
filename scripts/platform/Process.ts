/**
 * @fileoverview Effect `Process` service: runs child processes with typed outcomes.
 * @module scripts/platform/Process
 *
 * @remarks
 * Effect counterpart of the legacy `ProcessRunner` (`scripts/common/runner.ts`,
 * `scripts/common/runner.execa.ts`). {@link ProcessLive} spawns through the Effect
 * `ChildProcessSpawner`, resolves Windows `.cmd`/`.bat` shims with {@link planSpawn}, and maps every
 * non-success outcome to one of the {@link ProcessError} tagged errors. Interruption closes the
 * spawn scope, which terminates the whole process tree (`taskkill /T /F` on Windows, the process
 * group elsewhere).
 */

import {statSync} from "node:fs";

import {Clock, Context, Duration, Effect, Layer, Option, Predicate, Schema, Stream, type PlatformError} from "effect";
import {ChildProcess, ChildProcessSpawner} from "effect/process";

import {Environment} from "./Environment.ts";
import {OutputSettings, Presenter, type OutputStream} from "./Output.ts";
import {planSpawn} from "./windows.ts";

/** Describes one executable and its argument vector. */
export interface ProcessRequest {
  /** Executable name or path. */
  readonly command: string;
  /** Arguments passed to the executable. */
  readonly args: readonly string[];
}

/** Selects captured, tee, or inherited child output behavior. */
export type ProcessOutputMode = "capture" | "tee" | "inherit";

/** Configures one process invocation. */
export interface ProcessOptions {
  /** Working directory of the child; defaults to `Environment.cwd`. */
  readonly cwd?: string;
  /** Variables merged over `Environment.variables`; an `undefined` value unsets the variable. */
  readonly env?: Readonly<Record<string, string | undefined>>;
  /** Child output handling; defaults to `"capture"`. */
  readonly output?: ProcessOutputMode;
  /** Payload written once to the child's stdin, which is then closed. */
  readonly input?: string | Uint8Array;
  /** Time limit after which the child is terminated and the run fails with {@link ProcessTimedOut}. */
  readonly timeout?: Duration.Input;
  /** Whether to log `$ <command>` at debug level; defaults to `OutputSettings.verbose`. */
  readonly echo?: boolean;
}

/** Output of a process that exited with code `0`. */
export interface ProcessResult {
  /** Captured standard output (`""` in `inherit` mode). */
  readonly stdout: string;
  /** Captured standard error (`""` in `inherit` mode). */
  readonly stderr: string;
  /** Elapsed wall-clock duration in milliseconds. */
  readonly durationMs: number;
}

/** Maximum number of trailing characters of each stream kept on a failure. */
export const MAX_EVIDENCE_CHARACTERS = 2_000;

const failureFields = {
  command: Schema.String,
  stdout: Schema.String,
  stderr: Schema.String,
  durationMs: Schema.Number,
  message: Schema.String,
};

/** The process exited with a non-zero exit code. */
export class ProcessExited extends Schema.TaggedError<ProcessExited>()("ProcessExited", {
  ...failureFields,
  exitCode: Schema.Number,
}) {}

/** The process was terminated by a signal. */
export class ProcessSignalled extends Schema.TaggedError<ProcessSignalled>()("ProcessSignalled", {
  ...failureFields,
  signal: Schema.String,
}) {}

/** The process could not be started, or its streams failed. */
export class ProcessSpawnFailed extends Schema.TaggedError<ProcessSpawnFailed>()("ProcessSpawnFailed", {
  ...failureFields,
  reason: Schema.String,
}) {}

/** The process exceeded its time limit and was terminated. */
export class ProcessTimedOut extends Schema.TaggedError<ProcessTimedOut>()("ProcessTimedOut", {
  ...failureFields,
  timeoutMs: Schema.Number,
}) {}

/** Every typed failure of {@link Process.run}. */
export type ProcessError = ProcessExited | ProcessSignalled | ProcessSpawnFailed | ProcessTimedOut;

/** Service tag for running child processes. */
export class Process extends Context.Service<
  Process,
  {
    /** Runs one process to completion and succeeds only when it exits with code `0`. */
    readonly run: (request: ProcessRequest, options?: ProcessOptions) => Effect.Effect<ProcessResult, ProcessError>;
  }
>()("arolariu/scripts/Process") {}

/**
 * Renders one command token, quoting it when it is empty or contains whitespace or a quote.
 *
 * @param token - The token to render.
 * @returns The rendered token.
 */
function formatProcessToken(token: string): string {
  if (token.length === 0 || /\s/u.test(token) || token.includes('"')) {
    return `"${token.replaceAll('"', '\\"')}"`;
  }
  return token;
}

/**
 * Formats a request for diagnostics, exactly like the legacy `formatProcessRequest`; stdin and
 * environment values are never included.
 *
 * @param request - The request to render.
 * @returns Shell-like command text.
 */
export function formatProcessRequest(request: ProcessRequest): string {
  return [request.command, ...request.args].map(formatProcessToken).join(" ");
}

/**
 * Builds the diagnostic lines of a process failure.
 *
 * @param error - The process failure.
 * @returns The message, then `stdout: …` and `stderr: …` for each non-empty stream.
 */
export function processErrorEvidence(error: ProcessError): readonly string[] {
  return [
    error.message,
    ...(error.stdout.length > 0 ? [`stdout: ${error.stdout}`] : []),
    ...(error.stderr.length > 0 ? [`stderr: ${error.stderr}`] : []),
  ];
}

const FORCE_KILL_AFTER: Duration.Input = "1 second";
const SIGNAL_PATTERN = /receipt of signal: '([A-Z0-9]+)'/u;

/**
 * Keeps the last {@link MAX_EVIDENCE_CHARACTERS} characters of a stream.
 *
 * @param text - The captured stream.
 * @returns The bounded tail.
 */
function evidenceTail(text: string): string {
  return text.length > MAX_EVIDENCE_CHARACTERS ? text.slice(-MAX_EVIDENCE_CHARACTERS) : text;
}

/**
 * Checks whether a path is an existing regular file; the only synchronous filesystem access in `platform/`.
 *
 * @param path - The candidate path.
 * @returns `true` when the path exists and is a file.
 */
function isFile(path: string): boolean {
  try {
    return statSync(path, {throwIfNoEntry: false})?.isFile() === true;
  } catch {
    return false;
  }
}

/**
 * Merges invocation overrides over the snapshot variables and drops unset values.
 *
 * @param base - The snapshot variables.
 * @param overrides - The invocation overrides.
 * @returns The complete child environment.
 */
function mergeVariables(
  base: Readonly<Record<string, string | undefined>>,
  overrides: Readonly<Record<string, string | undefined>> | undefined,
): Record<string, string> {
  const merged: Record<string, string> = {};
  for (const [key, value] of Object.entries({...base, ...overrides})) {
    if (value !== undefined) {
      merged[key] = value;
    }
  }
  return merged;
}

/**
 * Extracts the terminating signal from the spawner's `exitCode` failure, if that is its cause.
 *
 * @param error - The platform failure.
 * @returns The signal name, or `undefined` for any other failure.
 */
function signalOf(error: PlatformError.PlatformError): string | undefined {
  const cause = error.reason.cause;
  if (error.reason.method !== "exitCode" || !(cause instanceof Error)) {
    return undefined;
  }
  return SIGNAL_PATTERN.exec(cause.message)?.[1];
}

/**
 * Picks the most specific failure reason: the Node errno code (`ENOENT`) when present, else the platform reason tag.
 *
 * @param error - The platform failure.
 * @returns The reason string.
 */
function reasonOf(error: PlatformError.PlatformError): string {
  const cause = error.reason.cause;
  return Predicate.hasProperty(cause, "code") && Predicate.isString(cause.code) ? cause.code : error.reason._tag;
}

type Completion = {readonly kind: "exited"; readonly exitCode: number} | {readonly kind: "signalled"; readonly signal: string};

/** Live {@link Process} layer over the Effect child-process spawner. */
export const ProcessLive: Layer.Layer<Process, never, ChildProcessSpawner.ChildProcessSpawner | Presenter | OutputSettings | Environment> =
  Layer.effect(
    Process,
    Effect.gen(function* () {
      const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
      const presenter = yield* Presenter;
      const settings = yield* OutputSettings;
      const environment = yield* Environment;

      const run = Effect.fn("Process.run")(function* (
        request: ProcessRequest,
        options: ProcessOptions = {},
      ): Effect.fn.Return<ProcessResult, ProcessError> {
        if (request.command.trim().length === 0) {
          return yield* Effect.die(new Error("Command cannot be empty"));
        }
        const output = options.output ?? "capture";
        if (output === "inherit" && options.input !== undefined) {
          return yield* Effect.die(new Error("Cannot supply input when output is inherited"));
        }

        const command = formatProcessRequest(request);
        if (options.echo ?? settings.verbose) {
          yield* Effect.logDebug(`$ ${command}`);
        }

        const variables = mergeVariables(environment.variables, options.env);
        const plan = planSpawn(request, {...environment, variables}, isFile);
        const childStream = output === "inherit" ? "inherit" : "pipe";
        // Shell plans are joined into one pre-escaped command line; passing args with `shell: true` triggers Node DEP0190.
        const childCommand = ChildProcess.make(
          plan.shell ? [plan.command, ...plan.args].join(" ") : plan.command,
          plan.shell ? [] : plan.args,
          {
            cwd: options.cwd ?? environment.cwd,
            env: variables,
            extendEnv: false,
            shell: plan.shell,
            killSignal: "SIGTERM",
            forceKillAfter: FORCE_KILL_AFTER,
            stdin: output === "inherit" ? "inherit" : options.input === undefined ? "ignore" : "pipe",
            stdout: childStream,
            stderr: childStream,
          },
        );

        const startedAt = yield* Clock.currentTimeMillis;
        const captured: Record<OutputStream, string> = {stdout: "", stderr: ""};
        const failureBase = Effect.map(Clock.currentTimeMillis, (now) => ({
          command,
          stdout: evidenceTail(captured.stdout),
          stderr: evidenceTail(captured.stderr),
          durationMs: now - startedAt,
        }));
        const spawnFailed = (error: PlatformError.PlatformError): Effect.Effect<never, ProcessSpawnFailed> =>
          Effect.flatMap(failureBase, (base) =>
            Effect.fail(
              new ProcessSpawnFailed({...base, reason: reasonOf(error), message: `${command} failed to start: ${error.message}`}),
            ),
          );

        const drain = (stream: Stream.Stream<Uint8Array, PlatformError.PlatformError>, name: OutputStream) => {
          const decoder = new TextDecoder();
          const append = (text: string): Effect.Effect<void> =>
            Effect.suspend(() => {
              if (text.length === 0) {
                return Effect.void;
              }
              captured[name] += text;
              return output === "tee" ? presenter.write(name, text) : Effect.void;
            });
          return Stream.runForEach(stream, (chunk) => append(decoder.decode(chunk, {stream: true}))).pipe(
            Effect.andThen(Effect.suspend(() => append(decoder.decode()))),
          );
        };

        return yield* Effect.scoped(
          Effect.gen(function* () {
            const handle = yield* spawner.spawn(childCommand);
            const completion = handle.exitCode.pipe(
              Effect.map((exitCode): Completion => ({kind: "exited", exitCode})),
              Effect.catch((error) => {
                const signal = signalOf(error);
                return signal === undefined ? Effect.fail(error) : Effect.succeed<Completion>({kind: "signalled", signal});
              }),
            );
            const input = options.input;
            const writeInput =
              input === undefined
                ? Effect.void
                : Effect.ignore(Stream.run(Stream.make(typeof input === "string" ? new TextEncoder().encode(input) : input), handle.stdin));
            const settled = Effect.all([completion, drain(handle.stdout, "stdout"), drain(handle.stderr, "stderr"), writeInput], {
              concurrency: "unbounded",
            }).pipe(Effect.map(([outcome]) => outcome));

            const timeout = options.timeout;
            const outcome = timeout === undefined ? Effect.map(settled, Option.some) : Effect.timeoutOption(settled, timeout);
            const finished = yield* outcome;
            if (Option.isNone(finished)) {
              yield* Effect.ignore(handle.kill({killSignal: "SIGTERM", forceKillAfter: FORCE_KILL_AFTER}));
              const timeoutMs = Duration.toMillis(timeout ?? 0);
              const base = yield* failureBase;
              return yield* new ProcessTimedOut({...base, timeoutMs, message: `${command} timed out after ${String(timeoutMs)} ms`});
            }

            const completed = finished.value;
            const base = yield* failureBase;
            if (completed.kind === "signalled") {
              return yield* new ProcessSignalled({
                ...base,
                signal: completed.signal,
                message: `${command} was terminated by ${completed.signal}`,
              });
            }
            if (completed.exitCode !== 0) {
              return yield* new ProcessExited({
                ...base,
                exitCode: completed.exitCode,
                message: `${command} exited with code ${String(completed.exitCode)}`,
              });
            }
            return {stdout: captured.stdout, stderr: captured.stderr, durationMs: base.durationMs};
          }).pipe(Effect.catchTag("PlatformError", spawnFailed)),
        );
      });

      return Process.of({run});
    }),
  );
