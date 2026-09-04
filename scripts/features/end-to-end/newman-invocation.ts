/**
 * @fileoverview Environment-derived Newman argument assembly and the single process invocation the
 * end-to-end feature performs, including the cancellation classification a cancelled run receives.
 * Every value is read from the injected environment snapshot, never from ambient `process` state,
 * and the invocation flows through the injected process runner, so no module in this feature ever
 * names Execa or `node:child_process`.
 * @module scripts/features/end-to-end/newman-invocation */

import {join, resolve} from "node:path";

import type {TerminalPresenter} from "../../core/presentation/terminal-presenter.ts";
import {ProcessRunnerError, type ProcessRunner} from "../../core/process/process-runner.ts";
import {commandCancellationFromSignal} from "../../core/runtime/cancellation.ts";
import type {FileSystem} from "../../core/runtime/runtime-capability.ts";
import type {RunnableEndToEndTarget} from "./targets.ts";

/** Everything one target's Newman invocation needs, resolved from the environment. */
export interface NewmanInvocationPlan {
  /** Absolute directory every reporter artifact is written to. */
  readonly reportDirectory: string;
  /** The complete `npx` argument list, in its unchanged order. */
  readonly args: readonly string[];
}

/** Read-only environment map every reader in this module observes. */
type EnvironmentVariables = Readonly<Record<string, string | undefined>>;

const describeError = (error: unknown): string => (error instanceof Error ? error.message : String(error));

/** Resolves the Postman environment profile one invocation selects. */
export function resolveEndToEndEnvironmentProfile(env: EnvironmentVariables): "local" | "production" {
  const rawEnvironment = (env["E2E_TEST_ENVIRONMENT"] ?? env["NEWMAN_ENVIRONMENT"] ?? "production").toLowerCase();
  return rawEnvironment === "local" ? "local" : "production";
}

/** Reads a positive integer from an environment map, warning and falling back when it is invalid. */
function readPositiveIntegerEnv(key: string, fallback: number, presenter: TerminalPresenter, env: EnvironmentVariables): number {
  const rawValue = env[key];
  if (rawValue === undefined || rawValue === "") {
    return fallback;
  }

  const parsedValue = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    presenter.warn(`Invalid ${key}="${rawValue}", using default ${String(fallback)}.`);
    return fallback;
  }

  return parsedValue;
}

/** Reads a boolean from an environment map, warning and falling back when it is unrecognized. */
function readBooleanEnv(key: string, fallback: boolean, presenter: TerminalPresenter, env: EnvironmentVariables): boolean {
  const rawValue = env[key];
  if (rawValue === undefined || rawValue === "") {
    return fallback;
  }

  const normalizedValue = rawValue.trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(normalizedValue)) {
    return true;
  }
  if (["false", "0", "no", "off"].includes(normalizedValue)) {
    return false;
  }

  presenter.warn(`Invalid ${key}="${rawValue}", using default ${String(fallback)}.`);
  return fallback;
}

/** Resolves the report directory, creates it best-effort, emits the unchanged report and timeout
 * diagnostic lines, and assembles the unchanged Newman argument list for one target. */
export async function planNewmanInvocation(
  options: Readonly<{
    files: FileSystem;
    presenter: TerminalPresenter;
    env: EnvironmentVariables;
    cwd: string;
    target: RunnableEndToEndTarget;
    collectionPath: string;
    environmentPath: string;
    authToken: string | undefined;
  }>,
): Promise<NewmanInvocationPlan> {
  const {files, presenter, env, cwd, target, collectionPath, environmentPath, authToken} = options;
  const rawDirectory = env["NEWMAN_REPORT_DIR"];
  const reportDirectory = resolve(cwd, rawDirectory === undefined || rawDirectory === "" ? "e2e-logs" : rawDirectory);
  try {
    await files.createDirectory(reportDirectory, {recursive: true});
  } catch (error: unknown) {
    presenter.warn(`Failed to create report directory: ${reportDirectory} (${describeError(error)})`);
  }

  const jsonPath = join(reportDirectory, `newman-${target}.json`);
  const junitPath = join(reportDirectory, `newman-${target}.xml`);
  const collectionTimeout = readPositiveIntegerEnv("NEWMAN_TIMEOUT", 600_000, presenter, env);
  const requestTimeout = readPositiveIntegerEnv("NEWMAN_TIMEOUT_REQUEST", 30_000, presenter, env);
  const scriptTimeout = readPositiveIntegerEnv("NEWMAN_TIMEOUT_SCRIPT", 10_000, presenter, env);
  const strictMode = readBooleanEnv("NEWMAN_STRICT_MODE", false, presenter, env);

  presenter.line(`JSON report: ${jsonPath}`);
  presenter.line(`JUnit report: ${junitPath}`);
  presenter.line(`Timeout: ${String(collectionTimeout)}ms (request: ${String(requestTimeout)}ms, script: ${String(scriptTimeout)}ms)`);
  presenter.line(`Strict mode (--bail): ${String(strictMode)}`);

  return {
    reportDirectory,
    args: [
      ...["newman", "run", collectionPath, "--environment", environmentPath],
      ...(authToken === undefined ? [] : ["--env-var", `authToken=${authToken}`]),
      ...["--reporters", "cli,json,junit", "--reporter-json-export", jsonPath, "--reporter-junit-export", junitPath],
      ...["--timeout", String(collectionTimeout), "--timeout-request", String(requestTimeout)],
      ...["--timeout-script", String(scriptTimeout)],
      ...(strictMode ? ["--bail"] : []),
    ],
  };
}

/** Runs one Newman invocation through the injected process runner. A cancelled process whose
 * invocation signal has already aborted is reclassified as the signal's own cancellation, so the
 * command reports the signal's exit code; every other failure — including a standalone typed
 * process cancellation with no aborted signal — propagates unchanged.
 * @throws {ProcessRunnerError} When Newman did not succeed.
 * @throws {CommandCancellation} When the invocation signal aborted and the process was cancelled. */
export async function runNewmanInvocation(
  options: Readonly<{runner: ProcessRunner; presenter: TerminalPresenter; signal: AbortSignal; cwd: string; args: readonly string[]}>,
): Promise<void> {
  const {runner, presenter, signal, cwd, args} = options;
  try {
    await runner.expectSuccess({command: "npx", args: [...args]}, {cwd, output: "inherit", signal, presenter});
  } catch (error: unknown) {
    if (error instanceof ProcessRunnerError && error.result.kind === "cancelled" && signal.aborted) {
      throw commandCancellationFromSignal(signal);
    }
    throw error;
  }
}
