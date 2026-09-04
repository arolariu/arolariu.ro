/**
 * @fileoverview Test builder for a fully hermetic {@link CommandHost}.
 * @module scripts/testing/builders/command-host.builder
 *
 * @remarks
 * `buildCommandHost` is the sole seam a command lifecycle test uses to inject a command host: it
 * records every exit code the lifecycle assigns, defaults `isDirectEntry` to `true`, and builds an
 * in-memory parse presenter that reuses the overridden runtime presenter when one is supplied. Its
 * runtime factory composes deterministic scopes from {@link buildRuntimeExecutionContext}: a root
 * scope links only the caller signal; a child scope links both the parent and caller signals,
 * shares the parent's environment, filesystem, HTTP client, and prompts, and forks the parent
 * presenter so redactions stay shared while presentation state stays independent.
 */

import type {CommandExecutionContext} from "../../core/command/command-execution.ts";
import type {
  CommandHost,
  CommandProcessHost,
  CommandRuntimeFactory,
  RuntimeCreationOptions,
} from "../../core/command/command-specification.ts";
import type {TerminalPresenter} from "../../core/presentation/terminal-presenter.ts";
import {linkAbortSignals} from "../../core/runtime/cancellation.ts";
import {LifoCleanupRegistry} from "../../core/runtime/cleanup.ts";
import type {RuntimeExecutionContext} from "../../core/runtime/runtime-execution-context.ts";
import {buildRecordingPresenter} from "../fixtures/terminal.fixture.ts";
import {buildRuntimeExecutionContext} from "./runtime-context.builder.ts";

/**
 * Builds a deterministic runtime factory whose scopes honor the same parent/child sharing and
 * cancellation linkage the production factory establishes.
 *
 * @param overrides - Capabilities that replace the defaults on every created scope.
 * @returns A runtime factory suitable for command lifecycle tests.
 */
function buildTestRuntimeFactory(overrides: Readonly<Partial<RuntimeExecutionContext>>): CommandRuntimeFactory {
  const shared = buildRuntimeExecutionContext(overrides);

  const createScope = (
    options: Readonly<RuntimeCreationOptions>,
    parent?: Readonly<CommandExecutionContext<RuntimeExecutionContext>>,
  ): RuntimeExecutionContext => {
    const link = linkAbortSignals(parent?.runtime.signal, options.signal);
    const cleanup = new LifoCleanupRegistry();
    cleanup.register("cancellation link", () => {
      link.dispose();
    });
    const presenter: TerminalPresenter =
      parent === undefined
        ? (overrides.presenter ?? buildRecordingPresenter({mode: options.presentation, verbose: false}).presenter)
        : parent.runtime.presenter.fork("test", {mode: options.presentation, verbose: false});
    return buildRuntimeExecutionContext({
      presenter,
      prompts: parent?.runtime.prompts ?? shared.prompts,
      http: parent?.runtime.http ?? shared.http,
      files: parent?.runtime.files ?? shared.files,
      clock: shared.clock,
      environment: parent?.runtime.environment ?? shared.environment,
      signal: link.signal,
      cleanup,
      ...overrides,
    });
  };

  return {
    createRoot: (options: Readonly<RuntimeCreationOptions>): Promise<RuntimeExecutionContext> => Promise.resolve(createScope(options)),
    createChild: (
      parent: Readonly<CommandExecutionContext<RuntimeExecutionContext>>,
      options: Readonly<RuntimeCreationOptions>,
    ): Promise<RuntimeExecutionContext> => Promise.resolve(createScope(options, parent)),
  };
}

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
    readonly runtime?: Readonly<Partial<RuntimeExecutionContext>>;
  }> = {},
): CommandHost & Readonly<{assignedExitCodes: readonly number[]}> {
  const assignedExitCodes: number[] = [];
  const isDirectEntry = overrides.isDirectEntry ?? true;
  const runtimeFactory = buildTestRuntimeFactory(overrides.runtime ?? {});
  const processHost: CommandProcessHost = {
    argv: Object.freeze([...(overrides.argv ?? [])]),
    isDirectEntry: (): boolean => isDirectEntry,
    setExitCode: (exitCode) => {
      assignedExitCodes.push(exitCode);
    },
  };

  return {
    ...processHost,
    createParsePresenter: () => overrides.runtime?.presenter ?? buildRecordingPresenter().presenter,
    loadRuntimeFactory: async () => runtimeFactory,
    get assignedExitCodes(): readonly number[] {
      return assignedExitCodes;
    },
  };
}
