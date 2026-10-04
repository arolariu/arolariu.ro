/**
 * @fileoverview effect/cli `doctor` subcommand routing into the legacy doctor command.
 * @module scripts/commands/doctor/cli
 *
 * @remarks
 * Decodes `--quick` and the global `--verbose` into a {@link DoctorInput} and runs the unmigrated
 * doctor command through `runLegacy`.
 */

import {Effect} from "effect";
import {Command, Flag} from "effect/cli";

import type {CliSubcommand} from "../../cli.ts";
import type {CommandInvoker} from "../../common/commander.ts";
import {doctorCommand} from "./index.ts";
import type {DoctorInput} from "./types.ts";
import {VerboseFlag, withCommandOutput} from "../flags.ts";
import {runLegacy} from "../legacy.ts";

/**
 * Builds the `doctor` subcommand.
 *
 * @param invoker - The legacy doctor invoker; tests pass a recording invoker.
 * @returns The `doctor` subcommand.
 */
export function makeDoctorCommand(invoker: CommandInvoker<DoctorInput, unknown> = doctorCommand): CliSubcommand {
  return Command.make(
    "doctor",
    {
      quick: Flag.Boolean("quick").pipe(Flag.withDefault(false), Flag.withDescription("Skip slower and network-dependent checks.")),
    },
    ({quick}) =>
      Effect.gen(function* () {
        const verbose = yield* VerboseFlag;
        yield* runLegacy("doctor", invoker, {quick, verbose});
      }).pipe(withCommandOutput("doctor")),
  ).pipe(Command.withDescription("Runs read-only workspace health diagnostics across every bounded context."));
}
