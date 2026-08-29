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
export interface RuntimeSelection {
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

/**
 * Prints a CLI-safe error message and marks the process as failed.
 *
 * @param error - Unknown error thrown by a CLI entrypoint.
 * @param logger - Logger used for the error message.
 */
export function exitWithError(error: unknown, logger: MonorepositoryLogger): void {
  logger.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
