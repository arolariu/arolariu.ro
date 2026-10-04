/**
 * @fileoverview effect/cli `status` subcommand routing into the legacy status command.
 * @module scripts/commands/status/cli
 *
 * @remarks
 * Decodes the global `--json` into a {@link StatusInput} and runs the unmigrated status command
 * through `runLegacy`, which also selects the JSON presentation.
 */

import {Effect} from "effect";
import {Command} from "effect/cli";

import type {CliSubcommand} from "../../cli.ts";
import type {CommandInvoker} from "../../common/commander.ts";
import {statusCommand, type StatusInput} from "./index.ts";
import {JsonFlag, withCommandOutput} from "../flags.ts";
import {runLegacy} from "../legacy.ts";

/**
 * Builds the `status` subcommand.
 *
 * @param invoker - The legacy status invoker; tests pass a recording invoker.
 * @returns The `status` subcommand.
 */
export function makeStatusCommand(invoker: CommandInvoker<StatusInput, unknown> = statusCommand): CliSubcommand {
  return Command.make("status", {}, () =>
    Effect.gen(function* () {
      const json = yield* JsonFlag;
      yield* runLegacy("status", invoker, {json});
    }).pipe(withCommandOutput("status")),
  ).pipe(Command.withDescription("Collects and renders monorepo health, workspace, git, security, and disk data."));
}
