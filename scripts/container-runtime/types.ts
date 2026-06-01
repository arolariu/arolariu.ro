/**
 * @fileoverview Shared types for local container runtime tooling.
 * @module scripts/container-runtime/types
 */

/** Supported local container engines for this repository. */
export type ContainerEngine = "rancher" | "podman";

/** Indicates where the selected container engine was configured. */
export type EngineSelectionSource = "argument" | "environment";

/** Resolved local container engine selection. */
export interface RuntimeSelection {
  readonly engine: ContainerEngine;
  readonly source: EngineSelectionSource;
}

/** Inputs used to resolve a local container engine selection. */
export interface SelectionInputs {
  readonly argv: readonly string[];
  readonly env: Readonly<NodeJS.ProcessEnv>;
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
 */
export function exitWithError(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
}
