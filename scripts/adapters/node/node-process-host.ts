/**
 * @fileoverview Node.js-backed process host: the exact ambient process facts and effects the
 * declarative command host and one runtime scope are allowed to depend on.
 * @module scripts/adapters/node/node-process-host
 *
 * @remarks
 * This module owns argv exposure, direct-entry detection, final exit-code assignment, and
 * operating-system termination signals — and nothing else. `process.exit()` stays prohibited
 * everywhere, including here.
 */

import {resolve} from "node:path";
import {fileURLToPath} from "node:url";

import type {CommandExitCode} from "../../core/command/command-execution.ts";
import type {CommandProcessHost} from "../../core/command/command-specification.ts";

/**
 * Sole Node.js-backed {@link CommandProcessHost}.
 *
 * @remarks
 * `argv` is frozen at module load from `process.argv.slice(2)`, so a later mutation of
 * `process.argv` can never change what an already-started command observes.
 */
export const nodeProcessHost: CommandProcessHost = {
  argv: Object.freeze(process.argv.slice(2)),
  isDirectEntry: (moduleUrl: string): boolean => {
    const entrypoint = process.argv[1];
    return entrypoint !== undefined && fileURLToPath(moduleUrl) === resolve(entrypoint);
  },
  setExitCode: (exitCode: CommandExitCode): void => {
    process.exitCode = exitCode;
  },
};

/**
 * Registers one interrupt and one termination handler on the current process.
 *
 * @remarks
 * The returned `unregister` removes exactly the two listeners this call added and is safe to call
 * more than once: a second call removes nothing, so a later foreign listener is never detached by
 * a stale registration.
 *
 * @param handlers - Callbacks invoked once the process receives `SIGINT` or `SIGTERM`.
 * @returns A handle that removes both registered listeners.
 */
export function registerProcessTerminationHandlers(
  handlers: Readonly<{onInterrupt: () => void; onTerminate: () => void}>,
): Readonly<{unregister: () => void}> {
  const onInterrupt = (): void => {
    handlers.onInterrupt();
  };
  const onTerminate = (): void => {
    handlers.onTerminate();
  };

  process.on("SIGINT", onInterrupt);
  process.on("SIGTERM", onTerminate);

  let registered = true;
  return {
    unregister: (): void => {
      if (!registered) {
        return;
      }
      registered = false;
      process.off("SIGINT", onInterrupt);
      process.off("SIGTERM", onTerminate);
    },
  };
}
