/**
 * @fileoverview Builders for one deterministic runtime execution context and the command execution
 * context that wraps it.
 * @module scripts/testing/builders/runtime-context.builder
 *
 * @remarks
 * Every default is deterministic and side-effect free: a fixed clock, a recording presenter, a
 * recording process runner, a repository-anchored in-memory filesystem, an HTTP client that always
 * answers `200`, and prompts that reject because no test may block on interactive input.
 */

import type {CommandExecutionContext, CommandPresentationMode} from "../../core/command/command-execution.ts";
import {commandCancellationFromSignal} from "../../core/runtime/cancellation.ts";
import {LifoCleanupRegistry} from "../../core/runtime/cleanup.ts";
import type {Clock, HttpClient, HttpResponse, PromptProvider} from "../../core/runtime/runtime-capability.ts";
import type {RuntimeExecutionContext} from "../../core/runtime/runtime-execution-context.ts";
import {DefaultTaskScheduler} from "../../core/runtime/task-scheduler.ts";
import {createHttpResponse} from "../fixtures/network.fixture.ts";
import {createRepositoryFixtureFileSystem} from "../fixtures/repository.fixture.ts";
import {buildRecordingPresenter} from "../fixtures/terminal.fixture.ts";
import {buildRecordingProcessRunner} from "./process-result.builder.ts";
import {buildRuntimeEnvironment} from "./environment.builder.ts";

/** Fixed clock every test runtime observes unless a case supplies its own. */
const testClock: Clock = {
  monotonicNow: (): number => 0,
  isoTimestamp: (): string => "2025-01-01T00:00:00.000Z",
  delay: (_milliseconds: number, signal?: AbortSignal): Promise<void> =>
    signal?.aborted === true ? Promise.reject(commandCancellationFromSignal(signal)) : Promise.resolve(),
};

function rejectPrompt<TValue>(kind: string): Promise<TValue> {
  return Promise.reject(new Error(`Interactive ${kind} prompts are not available in the test runtime.`));
}

/** Prompt provider that refuses every interactive request instead of blocking a test. */
const testPromptProvider: PromptProvider = {
  confirm: (): Promise<boolean> => rejectPrompt("confirm"),
  select: <TValue extends string>(): Promise<TValue> => rejectPrompt<TValue>("select"),
  text: (): Promise<string> => rejectPrompt("text"),
  secret: (): Promise<string> => rejectPrompt("secret"),
};

/** HTTP client that answers every request with an empty `200` response. */
const testHttpClient: HttpClient = {
  request: (): Promise<HttpResponse> => Promise.resolve(createHttpResponse(200, "")),
};

/**
 * Builds one complete, deterministic {@link RuntimeExecutionContext}.
 *
 * @param overrides - Capabilities that replace the deterministic defaults.
 * @returns A runtime execution context suitable for command and workflow tests.
 */
export function buildRuntimeExecutionContext(overrides: Readonly<Partial<RuntimeExecutionContext>> = {}): RuntimeExecutionContext {
  return {
    presenter: buildRecordingPresenter().presenter,
    prompts: testPromptProvider,
    runner: buildRecordingProcessRunner(),
    http: testHttpClient,
    files: createRepositoryFixtureFileSystem(),
    clock: testClock,
    tasks: new DefaultTaskScheduler(),
    environment: buildRuntimeEnvironment(),
    signal: new AbortController().signal,
    cleanup: new LifoCleanupRegistry(),
    ...overrides,
  };
}

/**
 * Builds one command execution context around a deterministic runtime.
 *
 * @param overrides - Optional runtime capability overrides and presentation mode.
 * @returns A command execution context suitable for composing a child invocation.
 */
export function buildCommandExecutionContext(
  overrides: Readonly<{
    runtime?: Readonly<Partial<RuntimeExecutionContext>>;
    presentation?: CommandPresentationMode;
  }> = {},
): CommandExecutionContext {
  return {
    runtime: buildRuntimeExecutionContext(overrides.runtime ?? {}),
    presentation: overrides.presentation ?? "silent",
  };
}
