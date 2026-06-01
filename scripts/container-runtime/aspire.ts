/**
 * @fileoverview Engine-aware Aspire AppHost startup.
 * @module scripts/container-runtime/aspire
 */

import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {getContainerAdapter, type ContainerRuntimeAdapter} from "./adapters.ts";
import {runSharedPreflight} from "./preflight.ts";
import {defaultRunner, type CommandRunner} from "./process.ts";
import {resolveContainerEngine} from "./selection.ts";
import {exitWithError} from "./types.ts";

/** Aspire AppHost command with runtime-specific environment. */
export interface AspireCommand {
  readonly command: string;
  readonly args: readonly string[];
  readonly env: NodeJS.ProcessEnv;
}

/**
 * Builds the Aspire AppHost command for the selected container engine.
 *
 * @param adapter - Selected runtime adapter.
 * @returns Command and environment for starting AppHost.
 */
export function buildAspireCommand(adapter: ContainerRuntimeAdapter): AspireCommand {
  return {
    command: "dotnet",
    args: ["run", "--project", "tooling/AppHost"],
    env: {
      ...process.env,
      DOTNET_ASPIRE_CONTAINER_RUNTIME: adapter.aspireRuntime,
    },
  };
}

/**
 * Starts Aspire AppHost with the selected container runtime.
 *
 * @param runner - Command runner used to execute AppHost.
 */
export async function runAspire(runner: CommandRunner = defaultRunner): Promise<void> {
  const selection = resolveContainerEngine({argv: process.argv, env: process.env});
  const adapter = getContainerAdapter(selection.engine);

  await runSharedPreflight(adapter, runner);
  const command = buildAspireCommand(adapter);
  const result = await runner.run(command, {env: command.env, stdio: "inherit"});

  if (result.code !== 0) {
    throw new Error(`Aspire AppHost exited with code ${result.code} for engine '${adapter.engine}'.`);
  }
}

const isDirectExecution = process.argv[1] !== undefined && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isDirectExecution) {
  try {
    await runAspire();
  } catch (error) {
    exitWithError(error);
  }
}
