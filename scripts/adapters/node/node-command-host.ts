/**
 * @fileoverview Sole production {@link CommandHost}: the Node-backed seam every migrated command
 * enters through its own literal `loadHost` loader.
 * @module scripts/adapters/node/node-command-host
 *
 * @remarks
 * `argv`, `isDirectEntry`, and `setExitCode` delegate to the shared {@link nodeProcessHost};
 * `createParsePresenter` builds the human presenter used for help and usage output before typed
 * input exists. `loadRuntimeFactory` literal dynamic-imports the Node runtime scope, so a help or
 * usage path never pays for it and the host's own eager module graph excludes every capability
 * that scope composes.
 */

import {nodeProcessHost} from "./node-process-host.ts";
import type {CommandHost, CommandRuntimeFactory} from "../../core/command/command-specification.ts";
import {ComposedTerminalPresenter} from "../../core/presentation/composed-terminal-presenter.ts";
import type {TerminalPresenter} from "../../core/presentation/terminal-presenter.ts";
import {NodeTerminalPresenterSink, nodeTerminalPresenterRuntimeHost} from "./node-terminal-sink.ts";

/**
 * Creates the production Node-backed command host.
 *
 * @param commandName - Logical command name used as the presenter context.
 * @returns The command host every migrated production entrypoint constructs its command with.
 */
export function createNodeCommandHost(commandName: string): CommandHost {
  return {
    argv: nodeProcessHost.argv,
    isDirectEntry: nodeProcessHost.isDirectEntry,
    setExitCode: nodeProcessHost.setExitCode,
    createParsePresenter: (): TerminalPresenter =>
      new ComposedTerminalPresenter(commandName, {
        mode: "human",
        verbose: false,
        sink: new NodeTerminalPresenterSink(),
        runtimeHost: nodeTerminalPresenterRuntimeHost,
      }),
    loadRuntimeFactory: async (verbose: boolean): Promise<CommandRuntimeFactory> => {
      const {createNodeCommandRuntimeFactory} = await import("./node-runtime-scope.ts");
      return createNodeCommandRuntimeFactory(commandName, verbose);
    },
  };
}
