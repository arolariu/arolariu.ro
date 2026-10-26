/**
 * @fileoverview effect/cli `format` and `lint` subcommands spawning the frozen Piscina formatter and linter.
 * @module scripts/commands/quality/cli
 *
 * @remarks
 * `format <target> [patterns...]` and `lint <target> [patterns...]` run
 * `node <scripts/format.ts|scripts/lint.ts> <target> ...patterns` with inherited output, so the
 * child renders everything and the CLI renders nothing else. A non-zero child exit becomes a
 * `ReportedFailure` with exit `1`; any other process failure propagates to the root renderer.
 */

import {resolve} from "node:path";

import {Effect} from "effect";
import {Argument, Command} from "effect/cli";

import type {CliSubcommand} from "../../cli.ts";
import {Environment} from "../../platform/Environment.ts";
import {ReportedFailure} from "../../platform/exit.ts";
import {Process} from "../../platform/Process.ts";
import {withCommandOutput} from "../flags.ts";

/** Every target accepted by `format` and `lint`. */
const qualityTargets = ["all", "packages", "website", "cv", "api", "status", "exp"] as const;

/** Script paths the quality commands spawn. */
export interface QualityScripts {
  /** Absolute path of the formatter entry script. */
  readonly format: string;
  /** Absolute path of the linter entry script. */
  readonly lint: string;
}

/** The repository `scripts/format.ts` and `scripts/lint.ts`. */
const defaultScripts: QualityScripts = {
  format: resolve(import.meta.dirname, "..", "..", "format.ts"),
  lint: resolve(import.meta.dirname, "..", "..", "lint.ts"),
};

/**
 * Builds one quality subcommand.
 *
 * @param name - The subcommand name, also used in the failure message.
 * @param scriptPath - The entry script the subcommand spawns.
 * @param description - The help description.
 * @returns The `format` or `lint` subcommand.
 */
function makeQualityCommand(name: keyof QualityScripts, scriptPath: string, description: string): CliSubcommand {
  return Command.make(
    name,
    {
      target: Argument.Literals("target", qualityTargets).pipe(
        Argument.withDescription("Target: all, packages, website, cv, api, status, or exp."),
      ),
      patterns: Argument.String("patterns").pipe(
        Argument.withDescription("Optional file patterns to restrict the run."),
        Argument.variadic(),
      ),
    },
    ({target, patterns}) =>
      Effect.gen(function* () {
        const environment = yield* Environment;
        const process = yield* Process;
        yield* process.run({command: environment.executablePath, args: [scriptPath, target, ...patterns]}, {output: "inherit"});
      }).pipe(
        Effect.catchTag("ProcessExited", (error) =>
          Effect.fail(new ReportedFailure({exitCode: 1, message: `${name} failed with exit code ${String(error.exitCode)}`})),
        ),
        withCommandOutput(name),
      ),
  ).pipe(Command.withDescription(description));
}

/**
 * Builds the `format` and `lint` subcommands.
 *
 * @param scripts - The entry scripts to spawn; defaults to the repository `scripts/format.ts` and `scripts/lint.ts`.
 * @returns The `format` and `lint` subcommands, in that order.
 */
export function makeQualityCommands(scripts: QualityScripts = defaultScripts): readonly [CliSubcommand, CliSubcommand] {
  return [
    makeQualityCommand("format", scripts.format, "Formats one monorepo target, or all of them, with parallel worker execution."),
    makeQualityCommand(
      "lint",
      scripts.lint,
      "Lints one monorepo target, or all of them, with per-target tool pipelines in parallel workers.",
    ),
  ];
}
