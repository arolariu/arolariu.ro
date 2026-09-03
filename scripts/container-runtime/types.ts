/**
 * @fileoverview Shared types for local container runtime tooling.
 * @module scripts/container-runtime/types
 */

import type {MonorepositoryLogger} from "../common/logger.ts";

/** Supported local container engines for this repository. */
export type ContainerEngine = "rancher" | "podman";

/** Indicates where the selected container engine was configured. */
export type EngineSelectionSource = "argument" | "environment" | "configuration";

/** Resolved local container engine selection. */
export interface ContainerEngineSelection {
  readonly engine: ContainerEngine;
  readonly source: EngineSelectionSource;
}

/** Inputs used to resolve a local container engine selection. */
export interface SelectionInputs {
  readonly argv: readonly string[];
  readonly env: Readonly<NodeJS.ProcessEnv>;
  readonly configuredEngine?: string;
}

/** Error raised when local container runtime configuration is invalid. */
export class ContainerRuntimeError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "ContainerRuntimeError";
  }
}

/** Shared shape of every declarative container command's typed input: an optional engine override. */
export interface ContainerEngineInput {
  /** Explicit engine override; omitted values fall back to environment or persisted configuration. */
  readonly engine?: ContainerEngine;
}

/** Typed input accepted by the declarative Compose command. */
export interface ComposeInput extends ContainerEngineInput {
  /** Compose file to invoke. */
  readonly file: string;
  /** Every argument following the literal `--` delimiter, forwarded to Compose unchanged. */
  readonly passthrough: readonly string[];
}

/** Local image action the declarative Image command accepts. */
export type ImageAction = "build" | "run";

/** Local image target the declarative Image command accepts. */
export type ImageTarget = "frontend" | "backend" | "cv" | "exp";

/** Typed input accepted by the declarative Image command. */
export interface ImageInput extends ContainerEngineInput {
  /** Selected image action. */
  readonly action: ImageAction;
  /** Selected image target. */
  readonly target: ImageTarget;
}

/** Typed business result produced by the declarative Aspire command. */
export interface AspireResult {
  /** Container engine Aspire AppHost ran with. */
  readonly engine: ContainerEngine;
}

/** Typed business result produced by the declarative Compose command. */
export interface ComposeResult {
  /** Container engine Compose ran with. */
  readonly engine: ContainerEngine;
  /** Compose file that was invoked. */
  readonly file: string;
  /** Every pass-through argument forwarded to Compose. */
  readonly passthrough: readonly string[];
}

/** Typed business result produced by the declarative Image command. */
export interface ImageResult {
  /** Container engine the image action ran with. */
  readonly engine: ContainerEngine;
  /** Image action that ran. */
  readonly action: ImageAction;
  /** Image target that ran. */
  readonly target: ImageTarget;
}

/**
 * Prints a CLI-safe error message and marks the process as failed.
 *
 * @deprecated Removed when Selfhost migrates in Task 21. Migrated commands report failures
 * through their typed {@link CommandExecution} instead of ambient `process.exitCode`.
 * @param error - Unknown error thrown by a CLI entrypoint.
 * @param logger - Logger used for the error message.
 */
export function exitWithError(error: unknown, logger: MonorepositoryLogger): void {
  logger.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
