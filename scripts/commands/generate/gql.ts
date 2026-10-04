/**
 * @fileoverview GraphQL types generator (placeholder implementation) as an Effect program.
 * @module scripts/commands/generate/gql
 *
 * @remarks
 * Current behavior is intentionally minimal: it writes a placeholder artifact to
 * `scripts/__generated__/gql` so the pipeline has a stable output location. Future work would
 * likely include schema introspection and codegen.
 */

import {DateTime, Effect, FileSystem, Path, type PlatformError} from "effect";

import {Environment} from "../../platform/Environment.ts";
import {writeTextAtomic} from "../../platform/Files.ts";
import {debugLogsEnabled, Presenter} from "../../platform/Output.ts";
import type {GenerateLeafResult, GenerateRequirements} from "./env.ts";

/** Completion summary of the placeholder generator. */
const SUMMARY = "GraphQL generation completed (placeholder).";

/**
 * Writes the GraphQL placeholder artifact.
 *
 * @remarks
 * Placeholder implementation that can be extended to fetch a remote schema (introspection),
 * generate TypeScript types via codegen, and output artifacts into a designated cache folder.
 */
export const generateGraphql: Effect.Effect<GenerateLeafResult, PlatformError.PlatformError, GenerateRequirements> = Effect.gen(
  function* () {
    const environment = yield* Environment;
    const presenter = yield* Presenter;
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const verbose = yield* debugLogsEnabled;

    yield* presenter.line("stdout", "🔧 Configuration:");
    yield* presenter.line("stdout", "");
    yield* presenter.line("stdout", `   Verbose: ${verbose ? "✅ Enabled" : "❌ Disabled"}`);
    yield* presenter.line("stdout", `   Working Directory: ${environment.cwd}`);
    yield* presenter.line("stdout", "");

    // Placeholder logic – ensure folder exists.
    const outDir = path.resolve(environment.cwd, "scripts", "__generated__", "gql");
    yield* fs.makeDirectory(outDir, {recursive: true});
    yield* Effect.logDebug(`Ensured output directory: ${outDir}`);

    // In the future replace with actual schema + codegen steps.
    const placeholder = `// Generated at ${DateTime.formatIso(yield* DateTime.now)}\n// TODO: Integrate GraphQL Codegen here.\n`;
    const outputFile = path.join(outDir, "README.placeholder.txt");
    yield* writeTextAtomic(outputFile, placeholder);
    yield* Effect.logDebug("Wrote placeholder artifact.");

    yield* presenter.success(SUMMARY);
    return {summary: SUMMARY, changedFiles: [outputFile]};
  },
).pipe(Effect.withSpan("generate.gql"));
