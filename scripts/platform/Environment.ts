/**
 * @fileoverview Effect `Environment` service: an immutable snapshot of the ambient process
 * environment a command observes.
 * @module scripts/platform/Environment
 *
 * @remarks
 * Effect counterpart of the legacy `RuntimeEnvironment` contract (`scripts/common/runtime.ts`).
 * {@link EnvironmentLive} is the single place that reads `process` for this snapshot; tests supply
 * a fixed snapshot through {@link layerEnvironment} instead.
 */

import {Context, Layer} from "effect";

/** Immutable snapshot of the ambient environment a command observes. */
export interface EnvironmentSnapshot {
  /** Environment variable values, read-only and never mutated by a command. */
  readonly variables: Readonly<Record<string, string | undefined>>;
  /** Working directory the command was launched from. */
  readonly cwd: string;
  /** Absolute path to the executable running the command. */
  readonly executablePath: string;
  /** Host operating-system platform identifier. */
  readonly platform: NodeJS.Platform;
  /** Host CPU architecture identifier. */
  readonly architecture: string;
  /** Whether standard input is attached to an interactive terminal. */
  readonly stdinIsTTY: boolean;
  /** Whether standard output is attached to an interactive terminal. */
  readonly stdoutIsTTY: boolean;
  /** Whether the command is running inside a continuous-integration environment. */
  readonly isCI: boolean;
}

/** Service tag for the ambient {@link EnvironmentSnapshot}. */
export class Environment extends Context.Service<Environment, EnvironmentSnapshot>()("arolariu/scripts/Environment") {}

/**
 * Builds a layer that provides a fixed environment snapshot.
 *
 * @param snapshot - The snapshot to expose as the {@link Environment} service.
 * @returns A layer providing {@link Environment} with exactly `snapshot`.
 */
export function layerEnvironment(snapshot: EnvironmentSnapshot): Layer.Layer<Environment> {
  return Layer.succeed(Environment, snapshot);
}

/**
 * Captures the ambient Node process environment with the legacy `snapshotNodeEnvironment` rules.
 *
 * @returns A snapshot whose `variables` is a frozen copy of `process.env`.
 */
function snapshotProcess(): EnvironmentSnapshot {
  return {
    variables: Object.freeze({...process.env}),
    cwd: process.cwd(),
    executablePath: process.execPath,
    platform: process.platform,
    architecture: process.arch,
    stdinIsTTY: process.stdin.isTTY === true,
    stdoutIsTTY: process.stdout.isTTY === true,
    isCI: Boolean(process.env["CI"] ?? process.env["GITHUB_ACTIONS"]),
  };
}

/** Layer that snapshots the ambient `process` once, when the layer is built. */
export const EnvironmentLive: Layer.Layer<Environment> = Layer.sync(Environment, snapshotProcess);
