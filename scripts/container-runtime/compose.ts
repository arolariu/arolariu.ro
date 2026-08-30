/**
 * @fileoverview Engine-aware Compose helper for local spin-ups.
 * @module scripts/container-runtime/compose
 */

import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {MonorepositoryConsoleLogger, type MonorepositoryLogger} from "../common/logger.ts";
import {resolveRepositoryPaths} from "../common/repository-paths.ts";
import {getContainerAdapter, type ContainerRuntimeAdapter, type RuntimeCommand} from "./adapters.ts";
import {runSharedPreflight} from "./preflight.ts";
import {defaultRunner, formatCommand, type CommandRunner} from "./process.ts";
import {resolveRuntimeContainerEngine} from "./selection.ts";
import {exitWithError} from "./types.ts";

/** Options for invoking an arbitrary Compose file through the selected engine. */
export interface ComposeOptions {
  readonly file: string;
  readonly args: readonly string[];
}

/**
 * Builds an engine-owned Compose command.
 *
 * @param adapter - Selected runtime adapter.
 * @param options - Compose file and arguments.
 * @returns Runtime command for invoking Compose.
 */
export function buildComposeCommand(adapter: ContainerRuntimeAdapter, options: ComposeOptions): RuntimeCommand {
  return adapter.compose(["-f", options.file, ...options.args]);
}

/**
 * Runs the ad hoc Compose CLI wrapper.
 *
 * @param runner - Command runner used to execute Compose.
 * @param logger - Logger used for orchestration output.
 */
export async function runComposeCli(
  runner: CommandRunner = defaultRunner,
  logger: MonorepositoryLogger = new MonorepositoryConsoleLogger("container::compose"),
): Promise<void> {
  const paths = resolveRepositoryPaths();
  const selection = await resolveRuntimeContainerEngine({
    argv: process.argv,
    env: process.env,
    toolingConfigPath: paths.toolingConfig,
  });
  const adapter = getContainerAdapter(selection.engine);
  await runSharedPreflight(adapter, runner, logger.child("preflight"));

  const fileIndex = process.argv.indexOf("--file");
  const separatorIndex = process.argv.indexOf("--");
  const file = fileIndex === -1 ? undefined : process.argv[fileIndex + 1];
  const args = separatorIndex === -1 ? [] : process.argv.slice(separatorIndex + 1);

  if (file === undefined || args.length === 0) {
    throw new Error("Use --file <compose-file> -- <compose arguments>");
  }

  const command = buildComposeCommand(adapter, {file, args});
  logger.command(formatCommand(command));
  const result = await runner.run(command, {stdio: "tee", logger});
  if (result.code !== 0) throw new Error(result.output);
}

const isDirectExecution = process.argv[1] !== undefined && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isDirectExecution) {
  try {
    await runComposeCli();
  } catch (error) {
    exitWithError(error, new MonorepositoryConsoleLogger("container::compose"));
  }
}
