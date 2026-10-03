/**
 * @fileoverview Single effect/cli entrypoint of the repository tooling (`node scripts/cli.ts`).
 * @module scripts/cli
 *
 * @remarks
 * {@link makeRootCommand} builds the `arolariu` root with the global `--json` and `--verbose` flags;
 * {@link runCli} parses and runs one invocation, rendering any failure that no command already
 * reported. effect/cli prints help, version, completions, and parse errors through `Console`, which
 * this module routes into the platform `Sink` (to stderr under `--json`, where a usage error becomes
 * the single stdout JSON document), so the sink stays the only writer of the process streams. The
 * entry block maps the final exit through `exitCodeFor`, the only exit-code mapping.
 */

import {NodeRuntime} from "@effect/platform-node";
import {Cause, Console, Effect, Sink as EffectSink, Formatter, Result, Stdio, Stream, Terminal} from "effect";
import {CliError, Command, type GlobalFlag} from "effect/cli";

import packageJson from "../package.json" with {type: "json"};
import {makeContainersCommand} from "./commands/containers/cli.ts";
import {makeDevCommand} from "./commands/dev/cli.ts";
import {makeDocsCommand} from "./commands/docs/cli.ts";
import {makeDoctorCommand} from "./commands/doctor/cli.ts";
import {makeE2eCommand} from "./commands/e2e/cli.ts";
import {JsonFlag, VerboseFlag} from "./commands/flags.ts";
import {makeGenerateCommand} from "./commands/generate/cli.ts";
import {makeQualityCommands} from "./commands/quality/cli.ts";
import {makeRatesCommand} from "./commands/rates/cli.ts";
import {makeSetupCommand} from "./commands/setup/cli.ts";
import {makeStatusCommand} from "./commands/status/cli.ts";
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

/** Services a {@link CliSubcommand} handler may require: the base services and the root's global settings. */
export type SubcommandServices = BaseServices | GlobalFlag.Setting.Identifier<"json"> | GlobalFlag.Setting.Identifier<"verbose">;

/**
 * A command family registered under the root.
 *
 * @remarks
 * `Name` is invariant in `Command`, so it must be `any` to accept every family name; the requirement
 * parameter is covariant, so a family whose handler needs a service outside
 * {@link SubcommandServices} fails to compile. Type family factories with this alias rather than
 * `Command.Any`, whose erased variance would bypass that check.
 */
export type CliSubcommand = Command.Command<any, never, unknown, unknown, SubcommandServices>;

/**
 * Builds the `arolariu` root command.
 *
 * @param subcommands - The command families; the root has no handler of its own, so running it
 * without a subcommand prints help.
 * @returns The root command with the global `--json` and `--verbose` flags.
 */
export function makeRootCommand(subcommands: readonly [CliSubcommand, ...CliSubcommand[]]): RootCommand {
  return Command.make("arolariu").pipe(
    Command.withDescription("arolariu.ro repository tooling."),
    Command.withSubcommands(subcommands),
    Command.withGlobalFlags([JsonFlag, VerboseFlag]),
  );
}

/** The production root command with every registered command family. */
export const rootCommand: RootCommand = makeRootCommand([
  makeSetupCommand(),
  makeDoctorCommand(),
  makeStatusCommand(),
  makeGenerateCommand(),
  makeDocsCommand(),
  makeRatesCommand(),
  makeDevCommand(),
  makeContainersCommand(),
  makeE2eCommand(),
  ...makeQualityCommands(),
]);

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
 * Renders a CLI usage failure as the single JSON document of a `--json` invocation.
 *
 * @remarks
 * effect/cli already printed help and the error text (to stderr in JSON mode). A `ShowHelp` without
 * errors is a help request, not a failure, so it renders nothing.
 *
 * @param error - The CLI error.
 * @returns An effect writing `{status: "failed", kind: "usage", message, evidence}` to stdout, where
 * `message` is the first error message and `evidence` holds the remaining ones.
 */
function renderJsonUsageFailure(error: CliError.CliError): Effect.Effect<void, never, Sink> {
  const [first, ...rest] = error._tag === "ShowHelp" ? error.errors : [error];
  if (first === undefined) {
    return Effect.void;
  }
  const document = {status: "failed", kind: "usage", message: first.message, evidence: rest.map((entry) => entry.message)};
  return Effect.gen(function* () {
    const sink = yield* Sink;
    yield* sink.write({stream: "stdout", text: `${JSON.stringify(document, null, 2)}\n`});
  });
}

/**
 * Renders the failure of one invocation unless something already reported it.
 *
 * @param cause - The failure cause.
 * @param json - Whether the invocation requested `--json`.
 * @returns An effect rendering an unreported failure, or in JSON mode a CLI usage failure.
 */
function renderInvocationFailure(cause: Cause.Cause<unknown>, json: boolean): Effect.Effect<void, never, Sink> {
  if (isUnreported(cause)) {
    return renderUnreportedFailure(cause, json);
  }
  const failure = Cause.findError(cause);
  return json && Result.isSuccess(failure) && CliError.isCliError(failure.success) ? renderJsonUsageFailure(failure.success) : Effect.void;
}

/**
 * Adapts the platform sink to the `Console` effect/cli prints through.
 *
 * @param sink - The destination sink.
 * @param json - Whether the invocation requested `--json`; then every line goes to stderr, keeping
 * stdout for the single JSON document.
 * @returns A console writing `log`/`info`/`debug`/`dir`/`table`/`group` lines to stdout (stderr in
 * JSON mode) and `error`/`warn`/`trace`/failed `assert` lines to stderr; counters and timers are ignored.
 */
function sinkConsole(sink: SinkShape, json: boolean): Console.Console {
  const writer =
    (stream: OutputStream) =>
    (...args: readonly unknown[]): void => {
      const text = args.map((arg) => (typeof arg === "string" ? arg : Formatter.format(arg))).join(" ");
      Effect.runSync(sink.write({stream, text: `${text}\n`}));
    };
  const err = writer("stderr");
  const out = json ? err : writer("stdout");
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
 * through {@link renderUnreportedFailure} (JSON mode when `argv` contains `--json`). In JSON mode,
 * effect/cli's help and error text goes to stderr and a CLI usage failure becomes the single stdout
 * document `{status: "failed", kind: "usage", message, evidence}`. Every failure is re-raised
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
      Effect.tapCause((cause) => renderInvocationFailure(cause, json)),
      Effect.provideService(Stdio.Stdio, invocationStdio(argv)),
      Effect.provideService(Console.Console, sinkConsole(sink, json)),
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
