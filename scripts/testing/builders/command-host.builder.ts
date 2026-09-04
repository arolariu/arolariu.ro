/**
 * @fileoverview Test builder for a fully hermetic {@link CommandHost}.
 * @module scripts/testing/builders/command-host.builder
 *
 * @remarks
 * `buildCommandHost` is the sole seam a command lifecycle test uses to inject a command host: it
 * records every exit code the lifecycle assigns, defaults `isDirectEntry` to `true`, and builds an
 * in-memory parse presenter that reuses the overridden runtime logger when one is supplied, so a
 * test observes parse-time and runtime output through the same sink. `loadRuntimeFactory` resolves
 * `scripts/common/runtime.testing.ts`'s deterministic factory as a temporary edge; **Task 3**
 * retargets it to the new runtime builders and fixtures.
 */

import {InMemoryLoggerSink, MonorepositoryConsoleLogger, type LoggerRuntimeHost} from "../../common/logger.ts";
import type {CommandRuntime} from "../../common/runtime.ts";
import {createTestRuntimeFactory} from "../../common/runtime.testing.ts";
import type {CommandHost, CommandProcessHost} from "../../core/command/command-specification.ts";

/** Logger host whose progress interval never fires, so no test depends on wall-clock timing. */
const testParsePresenterRuntimeHost: LoggerRuntimeHost = {
  stdoutIsTTY: false,
  noColor: true,
  scheduleInterval: () => ({cancel: (): void => undefined, unref: (): void => undefined}),
};

/**
 * Builds a fully hermetic command host for a command lifecycle test.
 *
 * @param overrides - Optional invocation argv, direct-entry flag, and runtime capability overrides.
 * @returns The command host, exposing every exit code the lifecycle assigned to it.
 */
export function buildCommandHost(
  overrides: Readonly<{
    readonly argv?: readonly string[];
    readonly isDirectEntry?: boolean;
    readonly runtime?: Readonly<Partial<CommandRuntime>>;
  }> = {},
): CommandHost & Readonly<{assignedExitCodes: readonly number[]}> {
  const assignedExitCodes: number[] = [];
  const isDirectEntry = overrides.isDirectEntry ?? true;
  const processHost: CommandProcessHost = {
    argv: Object.freeze([...(overrides.argv ?? [])]),
    isDirectEntry: (): boolean => isDirectEntry,
    setExitCode: (exitCode) => {
      assignedExitCodes.push(exitCode);
    },
  };

  return {
    ...processHost,
    createParsePresenter: () =>
      overrides.runtime?.logger
      ?? new MonorepositoryConsoleLogger("test", {
        verbose: false,
        color: false,
        sink: new InMemoryLoggerSink(),
        runtimeHost: testParsePresenterRuntimeHost,
      }),
    loadRuntimeFactory: async () => createTestRuntimeFactory(overrides.runtime ?? {}),
    get assignedExitCodes(): readonly number[] {
      return assignedExitCodes;
    },
  };
}
