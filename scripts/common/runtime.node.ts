/**
 * @fileoverview Node.js-backed adapter kept for the frozen Piscina format/lint closure.
 * @module scripts/common/runtime.node
 *
 * @remarks
 * Only the format/lint closure imports this module: the Piscina-hosted `workers/shell.ts` takes
 * {@link nodeProcessRunner} because it has no command scope, and the `format.ts`/`lint.ts`
 * orchestrators (with the presentation helpers in `common/index.ts` that they share) take
 * {@link nodeLoggerRuntimeHost} so their loggers keep real TTY, `NO_COLOR`, and progress behavior.
 * Effect commands read the same primitives through the services in `scripts/platform/`.
 */

import type {EnvironmentSnapshot} from "../platform/Environment.ts";
import type {LoggerRuntimeHost, LoggerScheduledInterval} from "./logger.ts";
import {ExecaProcessRunner} from "./runner.execa.ts";
import type {ProcessRunner} from "./runner.ts";

/**
 * Builds an Execa-backed {@link ProcessRunner} bound to one immutable environment snapshot.
 *
 * @param environment - The exact environment variables and platform every spawned child observes.
 * @returns A process runner that never reads ambient `process.env`/`process.platform` itself.
 */
export function createNodeProcessRunner(environment: Readonly<EnvironmentSnapshot>): ProcessRunner {
  return new ExecaProcessRunner({
    baseEnvironment: environment.variables,
    platform: environment.platform,
    monotonicNow: (): number => performance.now(),
  });
}

/**
 * Captures an immutable snapshot of the ambient Node environment.
 *
 * @remarks
 * `variables` is a fresh plain object copied from `process.env` at call time, so a later mutation
 * of `process.env` never changes an already-captured snapshot.
 *
 * @returns The current environment, working directory, host platform/architecture, terminal
 * state, and CI detection.
 */
export function snapshotNodeEnvironment(): EnvironmentSnapshot {
  return {
    variables: {...process.env},
    cwd: process.cwd(),
    executablePath: process.execPath,
    platform: process.platform,
    architecture: process.arch,
    stdinIsTTY: process.stdin.isTTY === true,
    stdoutIsTTY: process.stdout.isTTY === true,
    isCI: Boolean(process.env["CI"] ?? process.env["GITHUB_ACTIONS"]),
  };
}

/**
 * Standalone facade over {@link createNodeProcessRunner} that snapshots the ambient environment
 * fresh at each call instead of once at module load.
 *
 * @remarks
 * Reserved for `scripts/workers/shell.ts`, which runs inside a Piscina worker thread with no
 * command runtime scope and invokes a runner exactly once per call, with no shared lifetime
 * across invocations. Command scopes must construct their own runner from one
 * {@link snapshotNodeEnvironment} call via {@link createNodeProcessRunner} instead of using this
 * facade, so every command observes one environment snapshot for its entire run.
 */
export const nodeProcessRunner: ProcessRunner = {
  run: (request, options) => createNodeProcessRunner(snapshotNodeEnvironment()).run(request, options),
  expectSuccess: (request, options) => createNodeProcessRunner(snapshotNodeEnvironment()).expectSuccess(request, options),
  scope: (defaults) => createNodeProcessRunner(snapshotNodeEnvironment()).scope(defaults),
};

/** Environment snapshot the logger runtime host derives its terminal and color policy from. */
const nodeLoggerEnvironment: EnvironmentSnapshot = snapshotNodeEnvironment();

/**
 * Sole Node.js-backed {@link LoggerRuntimeHost}: terminal and color policy snapshotted from the
 * runtime environment, plus native interval scheduling behind an explicit cancellation handle.
 */
export const nodeLoggerRuntimeHost: LoggerRuntimeHost = {
  stdoutIsTTY: nodeLoggerEnvironment.stdoutIsTTY,
  noColor: Object.hasOwn(nodeLoggerEnvironment.variables, "NO_COLOR"),
  scheduleInterval: (callback: () => void, intervalMs: number): LoggerScheduledInterval => {
    const timer = setInterval(callback, intervalMs);
    return {
      cancel: (): void => {
        clearInterval(timer);
      },
      unref: (): void => {
        timer.unref();
      },
    };
  },
};
