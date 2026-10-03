/**
 * @fileoverview Single effect/cli entrypoint of the repository tooling (`node scripts/cli.ts`).
 * @module scripts/cli
 *
 * @remarks
 * {@link makeRootCommand} builds the `arolariu` root with the global `--json` and `--verbose` flags;
 * {@link runCli} parses and runs one invocation, rendering any failure that no command already
 * reported. effect/cli prints help, version, completions, and parse errors through `Console`, which
 * this module routes into the platform `Sink`, so the sink stays the only writer of the process
 * streams. The entry block maps the final exit through `exitCodeFor`, the only exit-code mapping.
 */

import {NodeRuntime} from "@effect/platform-node";
import {Cause, Console, Effect, Sink as EffectSink, Formatter, Result, Stdio, Stream, Terminal} from "effect";
import {CliError, Command} from "effect/cli";

import packageJson from "../package.json" with {type: "json"};
import {JsonFlag, VerboseFlag} from "./commands/flags.ts";
import {exitCodeFor, ReportedFailure} from "./platform/exit.ts";
import {NodeBaseLayer, type BaseServices} from "./platform/layers.ts";
import {Sink, type OutputStream, type SinkShape} from "./platform/Output.ts";
import {
  processErrorEvidence,
  ProcessExited,
  ProcessSignalled,
  ProcessSpawnFailed,
  ProcessTimedOut,
  type ProcessError,
} from "./platform/Process.ts";
import {recordTerminationSignals} from "./platform/signals.ts";

/** Tooling version reported by `--version`, read from the root package manifest. */
const version: string = packageJson.version;

/**
 * The `arolariu` root command.
 *
 * @remarks
 * Its handlers may require only {@link BaseServices}: the root provides the `--json` and `--verbose`
 * settings, and each family provides the rest of its services with `withCommandOutput`.
 */
export type RootCommand = Command.Command<"arolariu", never, unknown, unknown, BaseServices>;

/**
 * Builds the `arolariu` root command.
 *
 * @remarks
 * Family commands are typed `Command.Any`, which erases their handler requirements, so this is the
 * one place that restates them: every family handler requires at most {@link BaseServices} plus the
 * root's global settings. A handler needing more would die with a missing-service defect.
 *
 * @param subcommands - The command families; the root has no handler of its own, so running it
 * without a subcommand prints help.
 * @returns The root command with the global `--json` and `--verbose` flags.
 */
export function makeRootCommand(subcommands: readonly [Command.Command.Any, ...Command.Command.Any[]]): RootCommand {
  const root = Command.make("arolariu").pipe(
    Command.withDescription("arolariu.ro repository tooling."),
    Command.withGlobalFlags([JsonFlag, VerboseFlag]),
    Command.withSubcommands(subcommands),
  );
  return root as RootCommand;
}

/** Placeholder subcommand that keeps the root valid until the command families are registered. */
const versionInfoCommand = Command.make("version-info", {}, () => Console.log(`arolariu ${version}`)).pipe(
  Command.withDescription("Print the tooling version."),
);

/** The production root command. */
export const rootCommand: RootCommand = makeRootCommand([versionInfoCommand]);

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
 * Decides whether a failure cause still needs rendering.
 *
 * @param cause - The failure cause.
 * @returns `false` when the first typed failure is a `ReportedFailure`, `CliError`, or `QuitError`
 * (already rendered) or when the cause holds only interruptions; `true` otherwise.
 */
function isUnreported(cause: Cause.Cause<unknown>): boolean {
  const failure = Cause.findError(cause);
  if (Result.isSuccess(failure)) {
    const error = failure.success;
    return !(error instanceof ReportedFailure || CliError.isCliError(error) || Terminal.isQuitError(error));
  }
  return Cause.hasDies(cause);
}

/**
 * Renders a failure that no command reported.
 *
 * @remarks
 * Human mode writes `[arolariu::cli] ⛔ <message>` to stderr. JSON mode writes one stdout document
 * `{status: "failed", kind, message, evidence}`, where `kind` is `internal` for a defect and
 * `evidence` holds the process diagnostics of a `ProcessError`.
 *
 * @param cause - The failure cause; its first typed failure, else its squashed defect, is rendered.
 * @param json - Whether the invocation requested `--json`.
 * @returns An effect that writes the diagnostic to the sink.
 */
export function renderUnreportedFailure(cause: Cause.Cause<unknown>, json: boolean): Effect.Effect<void, never, Sink> {
  return Effect.gen(function* () {
    const sink = yield* Sink;
    const failure = Cause.findError(cause);
    const error = Result.isSuccess(failure) ? failure.success : Cause.squash(cause);
    const message = messageOf(error);
    if (!json) {
      yield* sink.write({stream: "stderr", text: `[arolariu::cli] ⛔ ${message}\n`});
      return;
    }
    const evidence = isProcessError(error) ? processErrorEvidence(error) : [];
    const document = {status: "failed", kind: Result.isSuccess(failure) ? "operational" : "internal", message, evidence};
    yield* sink.write({stream: "stdout", text: `${JSON.stringify(document, null, 2)}\n`});
  });
}

/**
 * Adapts the platform sink to the `Console` effect/cli prints through.
 *
 * @param sink - The destination sink.
 * @returns A console writing `log`/`info`/`debug`/`dir`/`table`/`group` lines to stdout and
 * `error`/`warn`/`trace`/failed `assert` lines to stderr; counters and timers are ignored.
 */
function sinkConsole(sink: SinkShape): Console.Console {
  const writer =
    (stream: OutputStream) =>
    (...args: readonly unknown[]): void => {
      const text = args.map((arg) => (typeof arg === "string" ? arg : Formatter.format(arg))).join(" ");
      Effect.runSync(sink.write({stream, text: `${text}\n`}));
    };
  const out = writer("stdout");
  const err = writer("stderr");
  const ignore = (): void => undefined;
  return {
    assert: (condition: boolean, ...args: readonly unknown[]): void => {
      if (!condition) {
        err(...args);
      }
    },
    clear: ignore,
    count: ignore,
    countReset: ignore,
    debug: out,
    dir: out,
    dirxml: out,
    error: err,
    group: out,
    groupCollapsed: out,
    groupEnd: ignore,
    info: out,
    log: out,
    table: out,
    time: ignore,
    timeEnd: ignore,
    timeLog: ignore,
    trace: err,
    warn: err,
  };
}

/**
 * Builds the `Stdio` effect/cli 4.0.0 declares as a requirement of `Command.runWith`.
 *
 * @remarks
 * `runWith` never reads it: arguments are passed explicitly, output flows through `Console`, and
 * prompts read through `Terminal`. Every member except `args` dies, so a future read fails loudly
 * instead of silently dropping data.
 *
 * @param argv - The invocation arguments.
 * @returns A `Stdio` exposing `argv`.
 */
function invocationStdio(argv: readonly string[]): Stdio.Stdio {
  const unsupported = (): EffectSink.Sink<void, string | Uint8Array> =>
    EffectSink.die(new Error("effect/cli Stdio output is not supported"));
  return Stdio.make({
    args: Effect.succeed(argv),
    stdout: unsupported,
    stderr: unsupported,
    stdin: Stream.die(new Error("effect/cli Stdio input is not supported")),
  });
}

/**
 * Parses and runs one CLI invocation.
 *
 * @remarks
 * A failure that is not a `ReportedFailure`, `CliError`, `QuitError`, or interruption is rendered
 * through {@link renderUnreportedFailure} (JSON mode when `argv` contains `--json`) and re-raised
 * unchanged, so `exitCodeFor` still sees it.
 *
 * @param argv - Arguments after the program name.
 * @param root - The root command; defaults to {@link rootCommand}.
 * @returns The command program.
 */
export function runCli(argv: readonly string[], root: RootCommand = rootCommand): Effect.Effect<void, unknown, BaseServices> {
  const json = argv.includes("--json");
  return Effect.gen(function* () {
    const sink = yield* Sink;
    yield* Command.runWith(root, {version})(argv).pipe(
      Effect.tapCause((cause) => (isUnreported(cause) ? renderUnreportedFailure(cause, json) : Effect.void)),
      Effect.provideService(Stdio.Stdio, invocationStdio(argv)),
      Effect.provideService(Console.Console, sinkConsole(sink)),
    );
  });
}

if (import.meta.main) {
  const recorder = recordTerminationSignals();
  NodeRuntime.runMain(runCli(process.argv.slice(2)).pipe(Effect.provide(NodeBaseLayer)), {
    disableErrorReporting: true,
    teardown: (exit, onExit) => {
      recorder.dispose();
      onExit(exitCodeFor(exit, recorder.last()));
    },
  });
}
