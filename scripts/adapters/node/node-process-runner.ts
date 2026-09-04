/**
 * @fileoverview Node.js-backed child-process runner construction: the only Node module that
 * reaches the Execa process adapter. Every runner it builds is bound to one immutable environment
 * snapshot, so a spawned child observes exactly the variables and platform its owning scope
 * captured, never ambient state read at spawn time.
 * @module scripts/adapters/node/node-process-runner
 */

import {ExecaProcessRunner} from "../execa/execa-process-runner.ts";
import type {ProcessRunner} from "../../core/process/process-runner.ts";
import type {RuntimeEnvironment} from "../../core/runtime/runtime-capability.ts";
import {nodeClock, snapshotNodeEnvironment} from "./node-platform.ts";

/**
 * Builds an Execa-backed {@link ProcessRunner} bound to one immutable environment snapshot.
 *
 * @param environment - The exact environment variables and platform every spawned child observes.
 * @returns A process runner that never reads ambient `process.env`/`process.platform` itself.
 */
export function createNodeProcessRunner(environment: Readonly<RuntimeEnvironment>): ProcessRunner {
  return new ExecaProcessRunner({
    baseEnvironment: environment.variables,
    platform: environment.platform,
    monotonicNow: (): number => nodeClock.monotonicNow(),
  });
}

/**
 * Standalone facade over {@link createNodeProcessRunner} that snapshots the ambient environment
 * fresh at each call instead of once at module load.
 *
 * @remarks
 * Reserved for `scripts/workers/shell.ts`, which runs inside a Piscina worker thread with no
 * command runtime scope and invokes a runner exactly once per call. Command scopes must construct
 * their own runner from one {@link snapshotNodeEnvironment} call via
 * {@link createNodeProcessRunner}, so every command observes one snapshot for its entire run.
 */
export const nodeProcessRunner: ProcessRunner = {
  run: (request, options) => createNodeProcessRunner(snapshotNodeEnvironment()).run(request, options),
  expectSuccess: (request, options) => createNodeProcessRunner(snapshotNodeEnvironment()).expectSuccess(request, options),
  scope: (defaults) => createNodeProcessRunner(snapshotNodeEnvironment()).scope(defaults),
};
