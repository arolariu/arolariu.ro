/**
 * @fileoverview GraphQL types generation command (placeholder implementation).
 * @module scripts/generate.gql
 *
 * @remarks
 * Current behavior is intentionally minimal: it writes a placeholder artifact to
 * `scripts/__generated__/gql` so the pipeline has a stable output location.
 *
 * Future work would likely include schema introspection + codegen.
 *
 * Every ambient effect (filesystem and the wall clock) is routed through the injected
 * {@link CommandContext.runtime} instead of touching Node globals directly.
 */

import path from "node:path";
import {MonorepoCommand, type CommandContext, type CommandRuntimeFactory} from "./common/commander.ts";

/** Typed input accepted by every migrated `generate` leaf command. */
export interface GenerateLeafInput {
  /** Enables diagnostic output. */
  readonly verbose: boolean;
}

/** Typed business result produced by every migrated `generate` leaf command. */
export interface GenerateLeafResult {
  /** Human-readable completion summary rendered by the command's human presentation. */
  readonly summary: string;
  /** Paths of every file this command created or modified. */
  readonly changedFiles: readonly string[];
}

/**
 * GraphQL Types generator business logic (placeholder).
 *
 * @remarks
 * Placeholder implementation that can be extended to:
 *  1. Fetch remote schema (introspection)
 *  2. Generate TypeScript types via codegen
 *  3. Output artifacts into a designated cache folder
 *
 * @param context - Command context whose runtime owns the filesystem, clock, and logging.
 * @param input - Typed command input.
 * @returns The completion summary and every file this invocation created or modified.
 */
async function generateGraphql(
  context: Readonly<CommandContext>,
  input: Readonly<GenerateLeafInput>,
): Promise<GenerateLeafResult> {
  const {logger, environment, files, clock} = context.runtime;
  const {verbose} = input;

  logger.line([{text: "🔧 Configuration:", styles: ["cyan"]}]);
  logger.line();
  logger.line([
    {text: "   Verbose: ", styles: ["gray"]},
    {text: verbose ? "✅ Enabled" : "❌ Disabled", styles: [verbose ? "green" : "red"]},
  ]);
  logger.line([
    {text: "   Working Directory: ", styles: ["gray"]},
    {text: environment.cwd, styles: ["dim"]},
  ]);
  logger.line();

  // Placeholder logic – ensure folder exists.
  const outDir = path.resolve(environment.cwd, "scripts", "__generated__", "gql");
  await files.createDirectory(outDir, {recursive: true});
  if (verbose) {
    logger.debug(`Ensured output directory: ${outDir}`);
  }

  // In the future replace with actual schema + codegen steps.
  const placeholder = `// Generated at ${clock.isoTimestamp()}\n// TODO: Integrate GraphQL Codegen here.\n`;
  const outputFile = path.join(outDir, "README.placeholder.txt");
  await files.writeText(outputFile, placeholder);
  if (verbose) {
    logger.debug("Wrote placeholder artifact.");
  }

  logger.success("GraphQL generation completed (placeholder).");
  return {summary: "GraphQL generation completed (placeholder).", changedFiles: [outputFile]};
}

/**
 * Creates the GraphQL generator command.
 *
 * @param runtimeFactory - Optional runtime factory; tests inject a fake instead of the Node adapter.
 * @returns The typed `generate:gql` command object.
 */
export function createGenerateGraphqlCommand(
  runtimeFactory?: CommandRuntimeFactory,
): MonorepoCommand<GenerateLeafInput, GenerateLeafResult> {
  return new MonorepoCommand<GenerateLeafInput, GenerateLeafResult>(
    {
      metadata: {
        name: "generate:gql",
        description: "Generates GraphQL type artifacts (placeholder implementation).",
        examples: ["npm run generate:gql", "npm run generate:gql -- --verbose"],
        slashAliases: {"/v": "--verbose", "/verbose": "--verbose"},
      },
      configure: (program) => {
        program.option("-v, --verbose", "Enable verbose logging.");
      },
      decode: (program) => ({verbose: program.opts<{verbose?: boolean}>().verbose === true}),
      execute: generateGraphql,
      completion: (result) => ({
        exitCode: 0,
        human: (logger) => logger.success(result.summary),
      }),
    },
    runtimeFactory,
  );
}

/** Production singleton used by the aggregate CLI and this module's direct entrypoint. */
export const generateGraphqlCommand: MonorepoCommand<GenerateLeafInput, GenerateLeafResult> = createGenerateGraphqlCommand();

await generateGraphqlCommand.runIfMain(import.meta.url);

