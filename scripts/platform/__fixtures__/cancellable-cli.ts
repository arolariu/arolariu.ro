/**
 * @fileoverview Test fixture CLI whose `hold` command keeps an inherited process tree alive until interrupted.
 * @module scripts/platform/__fixtures__/cancellable-cli
 *
 * @remarks
 * Builds a root with {@link makeRootCommand} and starts it exactly like `scripts/cli.ts`
 * (`NodeRuntime.runMain`, the termination-signal recorder, and `exitCodeFor`). `hold` prints
 * `READY` and runs `parent.js` (which spawns a grandchild and prints `PARENT=` and `GRANDCHILD=`)
 * with inherited output, so the only way out is interruption: a SIGINT/SIGTERM on POSIX, or
 * `--self-interrupt-after <ms>`, which interrupts the main fiber after the delay and exercises the
 * same `runMain` → finalizer → spawner-kill path on Windows, where Node cannot deliver a catchable
 * signal to another process.
 */

import {fileURLToPath} from "node:url";

import {NodeRuntime} from "@effect/platform-node";
import {Duration, Effect, Fiber, Option} from "effect";
import {Command, Flag} from "effect/cli";

import {makeRootCommand, runCli, type CliSubcommand} from "../../cli.ts";
import {withCommandOutput} from "../../commands/flags.ts";
import {exitCodeFor} from "../exit.ts";
import {NodeBaseLayer} from "../layers.ts";
import {Presenter} from "../Output.ts";
import {Process} from "../Process.ts";
import {recordTerminationSignals, TerminationSignals} from "../signals.ts";

/** The `parent.js` fixture that spawns the long-lived grandchild. */
const parentFixture = fileURLToPath(new URL("parent.js", import.meta.url));

/**
 * Builds the `hold` command.
 *
 * @returns A command that runs `parent.js` with inherited output until it is interrupted.
 */
function makeHoldCommand(): CliSubcommand {
  return Command.make(
    "hold",
    {
      selfInterruptAfter: Flag.Int("self-interrupt-after").pipe(
        Flag.optional,
        Flag.withDescription("Interrupt the main fiber after this many milliseconds."),
      ),
    },
    ({selfInterruptAfter}) =>
      Effect.gen(function* () {
        if (Option.isSome(selfInterruptAfter)) {
          const main = yield* Effect.fiber;
          yield* Effect.forkDetach(Effect.sleep(Duration.millis(selfInterruptAfter.value)).pipe(Effect.andThen(Fiber.interrupt(main))));
        }
        yield* (yield* Presenter).line("stdout", "READY");
        yield* (yield* Process).run({command: "node", args: [parentFixture]}, {output: "inherit"});
      }).pipe(withCommandOutput("cancellable")),
  ).pipe(Command.withDescription("Holds an inherited process tree until interrupted."));
}

if (import.meta.main) {
  const recorder = recordTerminationSignals();
  NodeRuntime.runMain(
    runCli(process.argv.slice(2), makeRootCommand([makeHoldCommand()])).pipe(
      Effect.provide(NodeBaseLayer),
      Effect.provideService(TerminationSignals, recorder),
    ),
    {
      disableErrorReporting: true,
      teardown: (exit, onExit) => {
        recorder.dispose();
        onExit(exitCodeFor(exit, recorder.last()));
      },
    },
  );
}
