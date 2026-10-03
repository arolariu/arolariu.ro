/**
 * @fileoverview effect/cli `dev` command group routing into the legacy Aspire and selfhost commands.
 * @module scripts/commands/dev/cli
 *
 * @remarks
 * `dev` has no handler of its own, so running it alone prints help. `dev aspire` decodes `--engine`
 * into a {@link ContainerEngineInput}; `dev selfhost [start|stop|logs]` (default `start`) decodes
 * the action and `--engine` into a {@link SelfhostInput}. Both run the unmigrated commands through
 * `runLegacy`.
 */

import {Argument, Command} from "effect/cli";

import type {CliSubcommand} from "../../cli.ts";
import type {CommandInvoker} from "../../common/commander.ts";
import {aspireCommand} from "../../container-runtime/aspire.ts";
import {selfhostCommand} from "../../container-runtime/selfhost.ts";
import type {ContainerEngineInput, SelfhostAction, SelfhostInput} from "../../container-runtime/types.ts";
import {EngineFlag, engineInput, withCommandOutput} from "../flags.ts";
import {runLegacy} from "../legacy.ts";

/** Every action accepted by the `dev selfhost` `action` argument. */
const selfhostActions = ["start", "stop", "logs"] as const satisfies readonly SelfhostAction[];

/** Legacy invokers the `dev` subcommands run; tests pass recording invokers. */
export interface DevInvokers {
  /** Invoker of `dev aspire`; defaults to the legacy Aspire command. */
  readonly aspire?: CommandInvoker<ContainerEngineInput, unknown>;
  /** Invoker of `dev selfhost`; defaults to the legacy selfhost command. */
  readonly selfhost?: CommandInvoker<SelfhostInput, unknown>;
}

/**
 * Builds the `dev` command group.
 *
 * @param invokers - Optional legacy invoker overrides.
 * @returns The `dev` group with its `aspire` and `selfhost` subcommands.
 */
export function makeDevCommand(invokers: DevInvokers = {}): CliSubcommand {
  const aspireInvoker = invokers.aspire ?? aspireCommand;
  const selfhostInvoker = invokers.selfhost ?? selfhostCommand;
  const aspire = Command.make("aspire", {engine: EngineFlag}, ({engine}) =>
    runLegacy("aspire", aspireInvoker, engineInput(engine)).pipe(withCommandOutput("aspire")),
  ).pipe(Command.withDescription("Starts the Aspire AppHost with the selected local container engine."));
  const selfhost = Command.make(
    "selfhost",
    {
      action: Argument.Literals("action", selfhostActions).pipe(
        Argument.withDescription("Selfhost action: start, stop, or logs."),
        Argument.withDefault("start"),
      ),
      engine: EngineFlag,
    },
    ({action, engine}) => runLegacy("selfhost", selfhostInvoker, {action, ...engineInput(engine)}).pipe(withCommandOutput("selfhost")),
  ).pipe(Command.withDescription("Runs selfhost container orchestration for the selected local engine."));
  return Command.make("dev").pipe(Command.withDescription("Local development environments."), Command.withSubcommands([aspire, selfhost]));
}
