/**
 * @fileoverview Node.js-backed platform capabilities: the clock, the task scheduler, and the
 * immutable ambient-environment snapshot.
 * @module scripts/adapters/node/node-platform
 *
 * @remarks
 * These are the cheap, always-eager capabilities every command scope owns from the moment it opens.
 * No other production script may call bare `setTimeout`, `performance.now()`, `new Date()`, or read
 * `process.env`, `process.platform`, `process.arch`, `process.execPath`, or `process.cwd()`.
 */

import {setTimeout as delay} from "node:timers/promises";

import {DefaultTaskScheduler, type TaskScheduler} from "../../core/runtime/task-scheduler.ts";
import type {Clock, RuntimeEnvironment} from "../../core/runtime/runtime-capability.ts";

/** Sole Node.js-backed {@link Clock}. */
export const nodeClock: Clock = {
  monotonicNow: (): number => performance.now(),
  isoTimestamp: (): string => new Date().toISOString(),
  delay: (milliseconds: number, signal?: AbortSignal): Promise<void> => delay(milliseconds, undefined, {signal}),
};

/** Sole Node.js-backed {@link TaskScheduler}; engine-neutral, so it simply reuses {@link DefaultTaskScheduler}. */
export const nodeTaskScheduler: TaskScheduler = new DefaultTaskScheduler();

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
export function snapshotNodeEnvironment(): RuntimeEnvironment {
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
