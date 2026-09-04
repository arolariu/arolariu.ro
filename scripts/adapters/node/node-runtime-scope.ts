/**
 * @fileoverview Node.js runtime scope composition and the production command runtime factory.
 * @module scripts/adapters/node/node-runtime-scope
 *
 * @remarks
 * A root scope snapshots the environment once and optionally registers the operating-system
 * termination handlers, unregistered again by its own cleanup entry. A child scope reuses only the
 * parent's immutable environment snapshot, receiving its own forked presenter, lazy capability
 * facades, cancellation controller, and cleanup registry. Cancellation flows parent to child only.
 */

import type {CommandExecutionContext, CommandPresentationMode} from "../../core/command/command-execution.ts";
import type {CommandRuntimeFactory, RuntimeCreationOptions} from "../../core/command/command-specification.ts";
import {ComposedTerminalPresenter} from "../../core/presentation/composed-terminal-presenter.ts";
import type {TerminalPresenter} from "../../core/presentation/terminal-presenter.ts";
import {CommandCancellation, linkAbortSignals} from "../../core/runtime/cancellation.ts";
import {LifoCleanupRegistry} from "../../core/runtime/cleanup.ts";
import type {
  CancellationRuntimeCapability,
  CleanupRuntimeCapability,
  PresentationRuntimeCapability,
} from "../../core/runtime/runtime-capability.ts";
import type {RuntimeExecutionContext} from "../../core/runtime/runtime-execution-context.ts";
import {
  createLazyNodeCapabilities,
  defaultNodeRuntimeCapabilityLoaders,
  type NodeRuntimeCapabilityLoaders,
} from "./node-lazy-capabilities.ts";
import {nodeClock, nodeTaskScheduler, snapshotNodeEnvironment} from "./node-platform.ts";
import {registerProcessTerminationHandlers} from "./node-process-host.ts";
import {NodeTerminalPresenterSink, nodeTerminalPresenterRuntimeHost} from "./node-terminal-sink.ts";

/** The capabilities one scope owns outright rather than inheriting or lazily loading. */
type ScopeOwnedCapabilities = PresentationRuntimeCapability & CancellationRuntimeCapability & CleanupRuntimeCapability;

/** Describes one Node-backed runtime scope the command host asks this module to assemble. */
export interface NodeRuntimeScopeOptions {
  /** Logical command name used as the presenter context. */
  readonly commandName: string;
  /** Whether the scope's presenter emits diagnostic messages. */
  readonly verbose: boolean;
  /** Presentation mode the scope's presenter must honor. */
  readonly presentation: CommandPresentationMode;
  /** Whether this scope owns SIGINT and SIGTERM registration. */
  readonly registerProcessSignals: boolean;
  /** Caller cancellation signal linked into this scope. */
  readonly signal?: AbortSignal;
  /** Owning parent context whose immutable environment snapshot this scope shares. */
  readonly parent?: Readonly<CommandExecutionContext<RuntimeExecutionContext>>;
  /** Capability loaders replacing the production defaults; a test seam only. */
  readonly loaders?: NodeRuntimeCapabilityLoaders;
}

/**
 * Assembles one Node-backed {@link RuntimeExecutionContext}.
 *
 * @param options - Scope name, verbosity, presentation, signal ownership, optional parent, and
 * optional capability loaders.
 * @returns The assembled runtime scope.
 */
export function createNodeRuntimeScope(options: Readonly<NodeRuntimeScopeOptions>): Promise<RuntimeExecutionContext> {
  const {parent} = options;
  const environment = parent?.runtime.environment ?? snapshotNodeEnvironment();
  const controller = new AbortController();
  const link = linkAbortSignals(parent?.runtime.signal, options.signal);
  const cleanup = new LifoCleanupRegistry();

  const abortScope = (reason: unknown): void => {
    if (!controller.signal.aborted) {
      controller.abort(reason);
    }
  };

  if (link.signal.aborted) {
    abortScope(link.signal.reason);
  } else {
    link.signal.addEventListener(
      "abort",
      () => {
        abortScope(link.signal.reason);
      },
      {once: true},
    );
  }
  cleanup.register("cancellation link", () => {
    link.dispose();
  });

  if (options.registerProcessSignals) {
    const registration = registerProcessTerminationHandlers({
      onInterrupt: () => {
        abortScope(new CommandCancellation("Command interrupted by SIGINT.", 130));
      },
      onTerminate: () => {
        abortScope(new CommandCancellation("Command terminated by SIGTERM.", 143));
      },
    });
    cleanup.register("process signal handlers", () => {
      registration.unregister();
    });
  }

  const presenter: TerminalPresenter =
    parent === undefined
      ? new ComposedTerminalPresenter(options.commandName, {
          mode: options.presentation,
          verbose: options.verbose,
          sink: new NodeTerminalPresenterSink(),
          runtimeHost: nodeTerminalPresenterRuntimeHost,
        })
      : parent.runtime.presenter.fork(options.commandName, {mode: options.presentation, verbose: options.verbose});

  const lazy = createLazyNodeCapabilities(options.loaders ?? defaultNodeRuntimeCapabilityLoaders, environment);
  const scopeOwned: ScopeOwnedCapabilities = {presenter, signal: controller.signal, cleanup};

  return Promise.resolve({
    ...scopeOwned,
    prompts: lazy.prompts,
    runner: lazy.runner,
    http: lazy.http,
    files: lazy.files,
    clock: nodeClock,
    tasks: nodeTaskScheduler,
    environment,
  });
}

/**
 * Builds the production {@link CommandRuntimeFactory} every migrated command uses by default.
 *
 * @param commandName - Logical command name used as the presenter context.
 * @param verbose - Whether invocation presenters emit diagnostic messages.
 * @returns A factory that creates Node-backed root scopes and child scopes.
 */
export function createNodeCommandRuntimeFactory(commandName: string, verbose: boolean): CommandRuntimeFactory {
  return {
    createRoot: (options: Readonly<RuntimeCreationOptions>): Promise<RuntimeExecutionContext> =>
      createNodeRuntimeScope({commandName, verbose, ...options}),
    createChild: (
      parent: Readonly<CommandExecutionContext<RuntimeExecutionContext>>,
      options: Readonly<RuntimeCreationOptions>,
    ): Promise<RuntimeExecutionContext> => createNodeRuntimeScope({commandName, verbose, parent, ...options}),
  };
}
