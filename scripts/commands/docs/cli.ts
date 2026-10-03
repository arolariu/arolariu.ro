/**
 * @fileoverview effect/cli `docs` command group routing `docs assemble` into the legacy assembler.
 * @module scripts/commands/docs/cli
 *
 * @remarks
 * `docs` has no handler of its own, so running it alone prints help. `docs assemble` takes no input
 * and runs the unmigrated documentation assembler through `runLegacy`.
 */

import {Command} from "effect/cli";

import type {CliSubcommand} from "../../cli.ts";
import type {CommandInvoker} from "../../common/commander.ts";
import {docsAssembleCommand} from "./assemble.ts";
import {withCommandOutput} from "../flags.ts";
import {runLegacy} from "../legacy.ts";

/**
 * Builds the `docs` command group.
 *
 * @param invoker - The legacy documentation assembly invoker; tests pass a recording invoker.
 * @returns The `docs` group with its `assemble` subcommand.
 */
export function makeDocsCommand(invoker: CommandInvoker<Record<never, never>, unknown> = docsAssembleCommand): CliSubcommand {
  const assemble = Command.make("assemble", {}, () => runLegacy("docs assemble", invoker, {}).pipe(withCommandOutput("docs"))).pipe(
    Command.withDescription(
      "Runs TypeDoc, pydoc-markdown, and DefaultDocumentation in parallel, normalizes frontmatter, writes landing pages, and mirrors prose into the Docusaurus source tree.",
    ),
  );
  return Command.make("docs").pipe(Command.withDescription("Documentation tooling."), Command.withSubcommands([assemble]));
}
