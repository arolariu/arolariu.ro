/**
 * @fileoverview effect/cli `docs` command group running the Effect documentation assembler.
 * @module scripts/commands/docs/cli
 *
 * @remarks
 * `docs` has no handler of its own, so running it alone prints help. `docs assemble` takes no input,
 * runs {@link assembleDocumentation}, and renders the legacy completion line. In `--json` mode the
 * {@link DocumentationAssemblyResult} is the single JSON document. Assembly failures stay typed
 * failures (exit `1`).
 */

import {Effect} from "effect";
import {Command} from "effect/cli";

import type {CliSubcommand} from "../../cli.ts";
import {Presenter, toJsonValue} from "../../platform/Output.ts";
import {withCommandOutput} from "../flags.ts";
import {assembleDocumentation, type DocumentationAssemblyResult} from "./assemble.ts";

/** `[arolariu::<context>]` prefix context of the `docs` family. */
const DOCS_LOG_CONTEXT = "docs";

/**
 * Renders the completion of one documentation assembly.
 *
 * @remarks
 * Writes the result as the JSON document (JSON mode only), then the legacy success line
 * `Assembled documentation from <n> extractor(s) across <m> tier(s).`.
 *
 * @param result - The assembly result.
 * @returns An effect rendering the completion.
 */
export function renderDocsAssembleCompletion(result: Readonly<DocumentationAssemblyResult>): Effect.Effect<void, never, Presenter> {
  return Effect.gen(function* () {
    const presenter = yield* Presenter;
    yield* Effect.orDie(presenter.json(toJsonValue(result)));
    yield* presenter.success(
      `Assembled documentation from ${String(result.extractorCount)} extractor(s) across ${String(result.generatedTiers.length)} tier(s).`,
    );
  });
}

/**
 * Builds the `docs` command group.
 *
 * @returns The `docs` group with its `assemble` subcommand.
 */
export function makeDocsCommand(): CliSubcommand {
  const assemble = Command.make("assemble", {}, () =>
    Effect.gen(function* () {
      yield* renderDocsAssembleCompletion(yield* assembleDocumentation);
    }).pipe(withCommandOutput(DOCS_LOG_CONTEXT)),
  ).pipe(
    Command.withDescription(
      "Runs TypeDoc, pydoc-markdown, and DefaultDocumentation in parallel, normalizes frontmatter, writes landing pages, and mirrors prose into the Docusaurus source tree.",
    ),
  );
  return Command.make("docs").pipe(Command.withDescription("Documentation tooling."), Command.withSubcommands([assemble]));
}
