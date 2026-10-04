/**
 * @fileoverview effect/cli `test` command group routing `test e2e` into the legacy Newman E2E runner.
 * @module scripts/commands/e2e/cli
 *
 * @remarks
 * `test` has no handler of its own, so running it alone prints help. `test e2e <target>` decodes the
 * required target (`all`, `backend`, `frontend`, or `cv`) into an {@link E2EInput} and runs the
 * unmigrated E2E command through `runLegacy`.
 */

import {Argument, Command} from "effect/cli";

import type {CliSubcommand} from "../../cli.ts";
import type {CommandInvoker} from "../../common/commander.ts";
import {e2eCommand, type E2EInput, type E2ETarget} from "./index.ts";
import {withCommandOutput} from "../flags.ts";
import {runLegacy} from "../legacy.ts";

/** Every target accepted by the `target` argument. */
const e2eTargets = ["all", "backend", "frontend", "cv"] as const satisfies readonly E2ETarget[];

/**
 * Builds the `test` command group.
 *
 * @param invoker - The legacy E2E invoker; tests pass a recording invoker.
 * @returns The `test` group with its `e2e` subcommand.
 */
export function makeE2eCommand(invoker: CommandInvoker<E2EInput, unknown> = e2eCommand): CliSubcommand {
  const e2e = Command.make(
    "e2e",
    {target: Argument.Literals("target", e2eTargets).pipe(Argument.withDescription("E2E target: all, backend, frontend, or cv."))},
    ({target}) => runLegacy("test:e2e", invoker, {target}).pipe(withCommandOutput("test:e2e")),
  ).pipe(Command.withDescription("Runs Postman/Newman E2E tests for arolariu.ro targets."));
  return Command.make("test").pipe(Command.withDescription("Repository test suites."), Command.withSubcommands([e2e]));
}
