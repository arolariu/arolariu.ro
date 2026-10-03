// @vitest-environment node
/**
 * @fileoverview Tests for the adapter that runs legacy `CommandInvoker`s inside effect/cli handlers.
 * @module scripts/commands/legacy.test
 *
 * @remarks
 * Fake invokers are plain objects implementing `CommandInvoker`, the legacy composition boundary
 * this adapter owns; no repository module is mocked.
 */

import {Cause, Effect, Exit, Fiber, Result} from "effect";
import {describe, expect, it} from "vitest";

import type {CommandExecution, CommandInvocationOptions, CommandInvoker} from "../common/commander.ts";
import {CommandInputError} from "../common/commander.ts";
import {ReportedFailure} from "../platform/exit.ts";
import {makeTestLayer} from "../platform/testing.ts";
import {JsonFlag} from "./flags.ts";
import {decodeInput, runLegacy} from "./legacy.ts";

type Input = Readonly<{target: string}>;

/**
 * Reads the first typed failure of an exit.
 *
 * @param exit - The exit to inspect.
 * @returns The typed failure, or `undefined` when the exit has none.
 */
function failureOf(exit: Exit.Exit<unknown, unknown>): unknown {
  if (Exit.isSuccess(exit)) {
    return undefined;
  }
  const failure = Cause.findError(exit.cause);
  return Result.isSuccess(failure) ? failure.success : undefined;
}

/**
 * Reads the first defect of an exit.
 *
 * @param exit - The exit to inspect.
 * @returns The defect, or `undefined` when the exit has none.
 */
function defectOf(exit: Exit.Exit<unknown, unknown>): unknown {
  if (Exit.isSuccess(exit)) {
    return undefined;
  }
  const defect = Cause.findDefect(exit.cause);
  return Result.isSuccess(defect) ? defect.success : undefined;
}

/**
 * Builds a fake invoker that resolves with `execution` and records the options it received.
 *
 * @param execution - The execution every invocation resolves with.
 * @param calls - Receives the options of each invocation.
 * @returns The fake invoker.
 */
function fakeInvoker(
  execution: CommandExecution<number>,
  calls: (Readonly<CommandInvocationOptions> | undefined)[] = [],
): CommandInvoker<Input, number> {
  return {
    invoke: async (_input, options) => {
      calls.push(options);
      return execution;
    },
  };
}

/**
 * Runs the legacy adapter with the given `--json` setting.
 *
 * @param invoker - The legacy invoker.
 * @param json - The `--json` global flag value.
 * @returns The exit of the adapter.
 */
function runAdapter(invoker: CommandInvoker<Input, number>, json = false): Promise<Exit.Exit<void, ReportedFailure>> {
  return Effect.runPromiseExit(runLegacy("demo", invoker, {target: "x"}).pipe(Effect.provideService(JsonFlag, json)));
}

describe("runLegacy", () => {
  it("passes the json presentation", async () => {
    // Arrange
    const calls: (Readonly<CommandInvocationOptions> | undefined)[] = [];
    const invoker = fakeInvoker({status: "completed", value: 1, exitCode: 0}, calls);

    // Act
    await runAdapter(invoker, true);
    await runAdapter(invoker, false);

    // Assert
    expect(calls.map((options) => options?.presentation)).toEqual(["json", "human"]);
    expect(calls[0]?.signal).toBeInstanceOf(AbortSignal);
  });

  it("completes for exit 0", async () => {
    // Arrange
    const invoker = fakeInvoker({status: "completed", value: 1, exitCode: 0});

    // Act
    const exit = await runAdapter(invoker);

    // Assert
    expect(Exit.isSuccess(exit)).toBe(true);
  });

  it("completes for help", async () => {
    // Arrange
    const invoker = fakeInvoker({status: "help", exitCode: 0});

    // Act
    const exit = await runAdapter(invoker);

    // Assert
    expect(Exit.isSuccess(exit)).toBe(true);
  });

  it("fails with a reported failure for exit 1", async () => {
    // Arrange
    const invoker = fakeInvoker({status: "completed", value: 1, exitCode: 1});

    // Act
    const exit = await runAdapter(invoker);

    // Assert
    expect(failureOf(exit)).toEqual(new ReportedFailure({exitCode: 1, message: "demo reported a failing result."}));
  });

  it("keeps usage exit 2", async () => {
    // Arrange
    const invoker = fakeInvoker({status: "failed", exitCode: 2, failure: {kind: "usage", message: "bad", evidence: []}});

    // Act
    const exit = await runAdapter(invoker);

    // Assert
    expect(failureOf(exit)).toEqual(new ReportedFailure({exitCode: 2, message: "bad"}));
  });

  it("maps a cancelled legacy execution to interruption", async () => {
    // Arrange
    const invoker = fakeInvoker({
      status: "cancelled",
      exitCode: 130,
      failure: {kind: "cancelled", message: "Command cancelled.", evidence: []},
    });

    // Act
    const exit = await runAdapter(invoker);

    // Assert
    expect(Exit.isFailure(exit) && Cause.hasInterruptsOnly(exit.cause)).toBe(true);
  });

  it("dies when the legacy invoker rejects", async () => {
    // Arrange
    const defect = new Error("broken invoker");
    const invoker: CommandInvoker<Input, number> = {invoke: () => Promise.reject(defect)};

    // Act
    const exit = await runAdapter(invoker);

    // Assert
    expect(defectOf(exit)).toBe(defect);
  });

  it("aborts the legacy signal on interruption and waits for the legacy cleanup", async () => {
    // Arrange
    const events: string[] = [];
    const {promise: started, resolve: markStarted} = Promise.withResolvers<void>();
    const invoker: CommandInvoker<Input, number> = {
      invoke: (_input, options) =>
        new Promise((resolve) => {
          options?.signal?.addEventListener("abort", () => {
            events.push("aborted");
            setTimeout(() => {
              events.push("cleaned up");
              resolve({status: "cancelled", exitCode: 130, failure: {kind: "cancelled", message: "x", evidence: []}});
            }, 20);
          });
          markStarted();
        }),
    };
    const fiber = Effect.runFork(runLegacy("demo", invoker, {target: "x"}).pipe(Effect.provideService(JsonFlag, false)));
    await started;

    // Act
    await Effect.runPromise(Fiber.interrupt(fiber));
    events.push("interrupted");

    // Assert
    expect(events).toEqual(["aborted", "cleaned up", "interrupted"]);
  });

  it("completes interruption when the aborted legacy invocation rejects", async () => {
    // Arrange
    const {promise: started, resolve: markStarted} = Promise.withResolvers<void>();
    const invoker: CommandInvoker<Input, number> = {
      invoke: (_input, options) =>
        new Promise((_resolve, reject) => {
          options?.signal?.addEventListener("abort", () => {
            reject(new Error("aborted"));
          });
          markStarted();
        }),
    };
    const fiber = Effect.runFork(runLegacy("demo", invoker, {target: "x"}).pipe(Effect.provideService(JsonFlag, false)));
    await started;

    // Act
    const exit = await Effect.runPromise(Fiber.interrupt(fiber).pipe(Effect.andThen(Fiber.await(fiber))));

    // Assert
    expect(Exit.isFailure(exit) && Cause.hasInterruptsOnly(exit.cause)).toBe(true);
  });
});

describe("decodeInput", () => {
  it("returns the decoded input", async () => {
    // Arrange
    const harness = makeTestLayer();

    // Act
    const value = await Effect.runPromise(decodeInput(() => 42).pipe(Effect.provide(harness.layer)));

    // Assert
    expect(value).toBe(42);
    expect(harness.output()).toEqual([]);
  });

  it("maps CommandInputError to usage", async () => {
    // Arrange
    const harness = makeTestLayer();

    // Act
    const exit = await Effect.runPromiseExit(
      decodeInput(() => {
        throw new CommandInputError("nope");
      }).pipe(Effect.provide(harness.layer)),
    );

    // Assert
    expect(failureOf(exit)).toEqual(new ReportedFailure({exitCode: 2, message: "nope"}));
    expect(harness.output()).toEqual([{stream: "stderr", text: "[arolariu::test] ⛔ nope\n"}]);
  });

  it("treats any other throw as a defect", async () => {
    // Arrange
    const harness = makeTestLayer();
    const defect = new TypeError("unexpected");

    // Act
    const exit = await Effect.runPromiseExit(
      decodeInput(() => {
        throw defect;
      }).pipe(Effect.provide(harness.layer)),
    );

    // Assert
    expect(defectOf(exit)).toBe(defect);
    expect(harness.output()).toEqual([]);
  });
});
