/**
 * @fileoverview Adapter that runs an unmigrated legacy command from an effect/cli handler.
 * @module scripts/commands/legacy
 *
 * @remarks
 * {@link runLegacy} invokes a legacy `CommandInvoker` with the presentation chosen by `--json` and
 * maps its `CommandExecution` into the Effect exit model consumed by `exitCodeFor`; the legacy
 * command keeps rendering its own output. {@link decodeInput} reuses a legacy input decoder and
 * turns its `CommandInputError` into a usage failure. Both disappear once every family is migrated.
 */

import {Effect} from "effect";
import type {GlobalFlag} from "effect/cli";

import {CommandInputError, type CommandExecution, type CommandInvoker, type CommandPresentation} from "../common/commander.ts";
import {ReportedFailure} from "../platform/exit.ts";
import {Presenter} from "../platform/Output.ts";
import {JsonFlag} from "./flags.ts";

/**
 * Starts a legacy invocation and waits for it to settle, including after interruption.
 *
 * @remarks
 * Interruption aborts the invocation signal and then waits for the legacy promise, so the legacy
 * cleanup finishes before the CLI exits. A rejected invocation is a defect: `invoke` never rejects.
 *
 * @param invoker - The legacy invoker.
 * @param input - The typed legacy input.
 * @param presentation - The legacy presentation mode.
 * @returns The legacy execution.
 */
function invokeLegacy<TInput, TOutput>(
  invoker: CommandInvoker<TInput, TOutput>,
  input: Readonly<TInput>,
  presentation: CommandPresentation,
): Effect.Effect<CommandExecution<TOutput>> {
  return Effect.callback<CommandExecution<TOutput>>((resume, signal) => {
    const invocation = Promise.resolve().then(() => invoker.invoke(input, {presentation, signal}));
    invocation.then(
      (execution) => resume(Effect.succeed(execution)),
      (error: unknown) => resume(Effect.die(error)),
    );
    return Effect.promise(() =>
      invocation.then(
        () => undefined,
        () => undefined,
      ),
    );
  });
}

/**
 * Runs a legacy command invoker inside an effect/cli handler.
 *
 * @remarks
 * The presentation is `"json"` when `--json` is set, otherwise `"human"`. A completed execution with
 * exit `0` and a help execution succeed; a completed execution with exit `1` fails with
 * `ReportedFailure({exitCode: 1, message: "<name> reported a failing result."})`; a failed execution
 * fails with `ReportedFailure({exitCode, message})`; a cancelled execution interrupts.
 *
 * @param name - Command name used in the business-failure message.
 * @param invoker - The legacy invoker.
 * @param input - The typed legacy input.
 * @returns An effect that succeeds when the legacy command succeeded.
 */
export function runLegacy<TInput, TOutput>(
  name: string,
  invoker: CommandInvoker<TInput, TOutput>,
  input: Readonly<TInput>,
): Effect.Effect<void, ReportedFailure, GlobalFlag.Setting.Identifier<"json">> {
  return Effect.gen(function* () {
    const json = yield* JsonFlag;
    const execution = yield* invokeLegacy(invoker, input, json ? "json" : "human");
    switch (execution.status) {
      case "help": {
        return;
      }
      case "completed": {
        if (execution.exitCode === 0) {
          return;
        }
        return yield* new ReportedFailure({exitCode: 1, message: `${name} reported a failing result.`});
      }
      case "failed": {
        return yield* new ReportedFailure({exitCode: execution.exitCode, message: execution.failure.message});
      }
      case "cancelled": {
        return yield* Effect.interrupt;
      }
    }
  });
}

/**
 * Runs a legacy input decoder.
 *
 * @param decode - Builds the typed input; it may throw `CommandInputError`.
 * @returns The decoded input. A `CommandInputError` is rendered through `Presenter.fatal` and fails
 * with `ReportedFailure({exitCode: 2, message})`; any other throw is a defect.
 */
export function decodeInput<T>(decode: () => T): Effect.Effect<T, ReportedFailure, Presenter> {
  return Effect.suspend(() => {
    try {
      return Effect.succeed(decode());
    } catch (error) {
      if (!(error instanceof CommandInputError)) {
        return Effect.die(error);
      }
      return Effect.gen(function* () {
        const presenter = yield* Presenter;
        yield* presenter.fatal(error.message);
        return yield* new ReportedFailure({exitCode: 2, message: error.message});
      });
    }
  });
}
