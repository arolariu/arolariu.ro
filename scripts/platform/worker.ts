/**
 * @fileoverview Effect entry point of the isolated child-process workers (`node <worker>.ts …`).
 * @module scripts/platform/worker
 *
 * @remarks
 * A worker is a module its parent spawns as a native Node child process and reads exactly one JSON
 * document from. {@link runWorkerProgram} is the testable core: it decodes the argument vector,
 * runs the worker program, and writes the encoded value through `Presenter.json`. A decode throw is
 * a usage failure (`ReportedFailure{exitCode: 2}`) whose message goes to stderr, so stdout stays
 * empty; any other unreported failure is also diagnosed on stderr only. {@link runWorker} runs that
 * core with `NodeRuntime.runMain` over the production JSON-mode layer and maps the final exit with
 * `exitCodeFor` and a termination-signal recorder, exactly like the CLI entry point.
 */

import {NodeRuntime} from "@effect/platform-node";
import {Cause, Effect, Result, type Scope} from "effect";

import {exitCodeFor, ReportedFailure} from "./exit.ts";
import {makeNodeLayer, type PlatformServices} from "./layers.ts";
import {Presenter, type JsonValue} from "./Output.ts";
import {recordTerminationSignals} from "./signals.ts";

/** Describes one worker: how it decodes its arguments, what it runs, and how it encodes the result. */
export interface WorkerOptions<I, A, E> {
  /** Worker name, used as the log context. */
  readonly name: string;
  /** Decodes the arguments after the script path; a throw is a usage failure. */
  readonly decode: (argv: readonly string[]) => I;
  /** The worker program. */
  readonly program: (input: I) => Effect.Effect<A, E, PlatformServices | Scope.Scope>;
  /** Encodes the program value into the single JSON document written to stdout. */
  readonly encode: (value: A) => JsonValue;
}

/**
 * Reads the message of a thrown or failed value.
 *
 * @param error - The thrown or failed value.
 * @returns Its `message` when it is an `Error`, otherwise its string form.
 */
function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Runs one worker invocation: decode, run, and write the single JSON document.
 *
 * @remarks
 * A decode throw is rendered with `Presenter.fatal` (stderr in JSON mode) and fails with
 * `ReportedFailure{exitCode: 2}` before the program runs. A program failure or defect that is not a
 * `ReportedFailure` is rendered the same way and re-raised unchanged; interruption renders nothing.
 * Writing the document twice or encoding a value that throws is a defect.
 *
 * @param options - The worker definition.
 * @param argv - The arguments after the script path.
 * @returns The worker invocation.
 */
export function runWorkerProgram<I, A, E>(
  options: WorkerOptions<I, A, E>,
  argv: readonly string[],
): Effect.Effect<void, E | ReportedFailure, PlatformServices | Scope.Scope> {
  return Effect.gen(function* () {
    const presenter = yield* Presenter;
    const decoded = yield* Effect.result(Effect.try({try: () => options.decode(argv), catch: (error) => error}));
    if (Result.isFailure(decoded)) {
      const message = messageOf(decoded.failure);
      yield* presenter.fatal(message);
      return yield* new ReportedFailure({exitCode: 2, message});
    }
    const value = yield* options.program(decoded.success).pipe(
      Effect.tapCause((cause) => {
        const failure = Cause.findError(cause);
        if (Result.isSuccess(failure) ? failure.success instanceof ReportedFailure : !Cause.hasDies(cause)) {
          return Effect.void;
        }
        return presenter.fatal(messageOf(Result.isSuccess(failure) ? failure.success : Cause.squash(cause)));
      }),
    );
    yield* presenter.json(options.encode(value)).pipe(Effect.orDie);
  });
}

/**
 * Runs a worker as the process entry point.
 *
 * @remarks
 * Call it only from the worker module's `import.meta.main` block. It reads `process.argv`, provides
 * `makeNodeLayer({mode: "json", verbose: false, color: false, context: options.name})`, and exits
 * with `exitCodeFor(exit, lastSignal)`: `0` after the document is written, `2` for a usage failure,
 * `1` for any other failure, and `130`/`143` after `SIGINT`/`SIGTERM`.
 *
 * @param options - The worker definition.
 */
export function runWorker<I, A, E>(options: WorkerOptions<I, A, E>): void {
  const recorder = recordTerminationSignals();
  const layer = makeNodeLayer({mode: "json", verbose: false, color: false, context: options.name});
  NodeRuntime.runMain(runWorkerProgram(options, process.argv.slice(2)).pipe(Effect.scoped, Effect.provide(layer)), {
    disableErrorReporting: true,
    teardown: (exit, onExit) => {
      recorder.dispose();
      onExit(exitCodeFor(exit, recorder.last()));
    },
  });
}
