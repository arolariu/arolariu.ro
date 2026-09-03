/**
 * @fileoverview Sole production {@link CommandHost}: the Node-backed seam every migrated command
 * enters through its own literal `loadHost` loader.
 * @module scripts/adapters/node/node-command-host
 *
 * @remarks
 * `argv`, `isDirectEntry`, and `setExitCode` delegate to the shared {@link nodeProcessHost};
 * `createParsePresenter` builds the human presenter used for help and usage output before typed
 * input exists. `loadRuntimeFactory` literal dynamic-imports the Node runtime adapter root, so a
 * help or usage path never pays for it. This is the *only* production module a command's own
 * `loadHost` loader ever names; `scripts/core/**` never imports it.
 *
 * @remarks
 * `nodeProcessHost` and the human presenter constructor are consumed from
 * `scripts/common/runtime.node.ts` as a temporary edge: Task 3 relocates them into
 * `scripts/adapters/node/node-process-host.ts` and this module's own presenter construction, and
 * retargets `loadRuntimeFactory`'s dynamic import to `./node-runtime-scope.ts`.
 */

import {nodeLoggerRuntimeHost, nodeProcessHost} from "../../common/runtime.node.ts";
import {MonorepositoryConsoleLogger, type MonorepositoryLogger} from "../../common/logger.ts";
import type {CommandHost, CommandRuntimeFactory} from "../../core/command/command-specification.ts";

/**
 * Creates the production Node-backed command host.
 *
 * @param commandName - Logical command name used as the logger context.
 * @returns The command host every migrated production entrypoint constructs its command with.
 */
export function createNodeCommandHost(commandName: string): CommandHost {
  return {
    argv: nodeProcessHost.argv,
    isDirectEntry: nodeProcessHost.isDirectEntry,
    setExitCode: nodeProcessHost.setExitCode,
    createParsePresenter: (): MonorepositoryLogger =>
      new MonorepositoryConsoleLogger(commandName, {mode: "human", verbose: false, runtimeHost: nodeLoggerRuntimeHost}),
    loadRuntimeFactory: async (verbose: boolean): Promise<CommandRuntimeFactory> => {
      const {createNodeCommandRuntimeFactory} = await import("../../common/runtime.node.ts");
      return createNodeCommandRuntimeFactory(commandName, verbose);
    },
  };
}
