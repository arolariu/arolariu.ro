// @vitest-environment node
/**
 * @fileoverview Tests for the Effect interop bridge used by legacy Promise commands.
 * @module scripts/platform/bridge.test
 *
 * @remarks
 * Every case injects a layer factory over the in-memory harness with the live clock, so real time
 * applies (cancellation waits on a real timer) while no test reaches a real external boundary.
 */

import {Cause, Effect, Exit, type Scope} from "effect";
import {describe, expect, it} from "vitest";

import {CommandCancellation} from "../common/runtime.ts";
import {createTestRuntimeFactory} from "../common/runtime.testing.ts";
import {legacyInvoker, runEffect, type LayerFactory} from "./bridge.ts";
import type {PlatformServices} from "./layers.ts";
import {OutputSettings, type OutputSettingsShape, type SinkRecord} from "./Output.ts";
import {ProcessExited} from "./Process.ts";
import {makeTestLayer, type TestHarness} from "./testing.ts";

/** A layer factory over a live-clock harness, plus accessors over the last harness it built. */
interface RecordingFactory {
  readonly makeLayer: LayerFactory;
  readonly output: () => readonly SinkRecord[];
  readonly settings: () => OutputSettingsShape | undefined;
}

/**
 * Builds a {@link LayerFactory} that records the settings it receives and the harness it builds.
 *
 * @returns The factory and its accessors.
 */
function recordingFactory(): RecordingFactory {
  let harness: TestHarness<PlatformServices> | undefined;
  let received: OutputSettingsShape | undefined;
  return {
    makeLayer: (settings) => {
      received = settings;
      harness = makeTestLayer({mode: settings.mode, verbose: settings.verbose, context: settings.context, clock: "live"});
      return harness.layer;
    },
    output: () => harness?.output() ?? [],
    settings: () => received,
  };
}

describe("runEffect", () => {
  it("runEffect returns a success exit", async () => {
    // Arrange
    const factory = recordingFactory();

    // Act
    const exit = await runEffect(Effect.succeed(1), {
      presentation: "silent",
      verbose: false,
      context: "bridge",
      makeLayer: factory.makeLayer,
    });

    // Assert
    expect(Exit.isSuccess(exit)).toBe(true);
    expect(Exit.isSuccess(exit) ? exit.value : undefined).toBe(1);
  });

  it("runEffect renders in the requested presentation", async () => {
    // Arrange
    const json = recordingFactory();
    const human = recordingFactory();

    // Act
    await runEffect(Effect.logInfo("x"), {presentation: "json", verbose: false, context: "bridge", makeLayer: json.makeLayer});
    await runEffect(Effect.logInfo("x"), {presentation: "human", verbose: true, context: "bridge", makeLayer: human.makeLayer});

    // Assert
    expect(json.output()).toEqual([]);
    expect(human.output()).toHaveLength(1);
    expect(human.output()[0]?.text).toContain("[arolariu::bridge]");
    expect(human.settings()).toMatchObject({mode: "human", verbose: true, context: "bridge"});
  });
});

describe("legacyInvoker", () => {
  it("legacyInvoker maps success with the business exit code", async () => {
    // Arrange
    const factory = recordingFactory();
    const invoker = legacyInvoker(
      "bridge",
      (_input: Readonly<{verbose?: boolean}>) => Effect.succeed({ok: false}),
      (output) => (output.ok ? 0 : 1),
      factory.makeLayer,
    );

    // Act
    const execution = await invoker.invoke({verbose: true});

    // Assert
    expect(execution).toEqual({status: "completed", exitCode: 1, value: {ok: false}});
    expect(factory.settings()).toMatchObject({mode: "silent", verbose: true, context: "bridge"});
  });

  it("legacyInvoker maps typed failures to operational exit 1 with process evidence", async () => {
    // Arrange
    const error = new ProcessExited({
      command: "git status",
      stdout: "",
      stderr: "boom",
      durationMs: 5,
      exitCode: 1,
      message: "git status exited with code 1",
    });
    const invoker = legacyInvoker(
      "bridge",
      () => Effect.fail(error),
      () => 0,
      recordingFactory().makeLayer,
    );

    // Act
    const execution = await invoker.invoke({}, {presentation: "human"});

    // Assert
    expect(execution).toEqual({
      status: "failed",
      exitCode: 1,
      failure: {
        kind: "operational",
        message: "git status exited with code 1",
        evidence: ["git status exited with code 1", "stderr: boom"],
        cause: error,
      },
    });
  });

  it("legacyInvoker maps defects to internal", async () => {
    // Arrange
    const invoker = legacyInvoker(
      "bridge",
      () => Effect.die("bad"),
      () => 0,
      recordingFactory().makeLayer,
    );

    // Act
    const execution = await invoker.invoke({});

    // Assert
    expect(execution).toEqual({status: "failed", exitCode: 1, failure: {kind: "internal", message: "bad", evidence: [], cause: "bad"}});
  });

  it("runs finalizers before resolving a cancelled execution", async () => {
    // Arrange
    const events: string[] = [];
    const program = (): Effect.Effect<never, never, PlatformServices | Scope.Scope> =>
      Effect.gen(function* () {
        yield* Effect.addFinalizer(() =>
          Effect.sync(() => {
            events.push("finalized");
          }),
        );
        return yield* Effect.never;
      });
    const invoker = legacyInvoker("bridge", program, () => 0, recordingFactory().makeLayer);
    const controller = new AbortController();
    setTimeout(() => {
      controller.abort();
    }, 50);

    // Act
    const observed = await invoker.invoke({}, {signal: controller.signal}).then((execution) => ({execution, events: [...events]}));

    // Assert
    expect(observed.execution).toMatchObject({
      status: "cancelled",
      exitCode: 130,
      failure: {kind: "cancelled", evidence: []},
    });
    expect(observed.execution.status === "cancelled" ? observed.execution.failure.cause : undefined).toBeInstanceOf(CommandCancellation);
    expect(observed.events).toEqual(["finalized"]);
  });

  it("legacyInvoker preserves a SIGTERM cancellation reason", async () => {
    // Arrange
    const reason = new CommandCancellation("Command terminated by SIGTERM.", 143);
    const invoker = legacyInvoker(
      "bridge",
      () => Effect.never,
      () => 0,
      recordingFactory().makeLayer,
    );
    const controller = new AbortController();
    setTimeout(() => {
      controller.abort(reason);
    }, 20);

    // Act
    const execution = await invoker.invoke({}, {signal: controller.signal});

    // Assert
    expect(execution).toEqual({
      status: "cancelled",
      exitCode: 143,
      failure: {kind: "cancelled", message: "Command terminated by SIGTERM.", evidence: [], cause: reason},
    });
  });

  it("legacyInvoker keeps a cancellation when a finalizer fails", async () => {
    // Arrange
    const program = (): Effect.Effect<never, never, PlatformServices | Scope.Scope> =>
      Effect.gen(function* () {
        yield* Effect.addFinalizer(() => Effect.die(new Error("cleanup broke")));
        return yield* Effect.never;
      });
    const invoker = legacyInvoker("bridge", program, () => 0, recordingFactory().makeLayer);
    const controller = new AbortController();
    setTimeout(() => {
      controller.abort(new CommandCancellation("Command interrupted by SIGINT.", 130));
    }, 20);

    // Act
    const execution = await invoker.invoke({}, {signal: controller.signal});

    // Assert
    expect(execution).toMatchObject({
      status: "cancelled",
      exitCode: 130,
      failure: {kind: "cancelled", message: "Command interrupted by SIGINT.", evidence: ["cleanup broke"]},
    });
  });

  it("legacyInvoker keeps a cancellation when the interrupted program also failed", async () => {
    // Arrange
    const controller = new AbortController();
    const reason = new CommandCancellation("Command terminated by SIGTERM.", 143);
    const program = (): Effect.Effect<never, Error> =>
      Effect.uninterruptible(
        Effect.sync(() => {
          controller.abort(reason);
        }).pipe(Effect.andThen(Effect.failCause(Cause.combine(Cause.fail(new Error("step failed")), Cause.interrupt())))),
      );
    const invoker = legacyInvoker("bridge", program, () => 0, recordingFactory().makeLayer);

    // Act
    const execution = await invoker.invoke({}, {signal: controller.signal});

    // Assert
    expect(execution).toEqual({
      status: "cancelled",
      exitCode: 143,
      failure: {kind: "cancelled", message: "Command terminated by SIGTERM.", evidence: ["step failed"], cause: reason},
    });
  });

  it("legacyInvoker maps a self-interruption without an aborted signal to 130", async () => {
    // Arrange
    const invoker = legacyInvoker(
      "bridge",
      () => Effect.interrupt,
      () => 0,
      recordingFactory().makeLayer,
    );

    // Act
    const execution = await invoker.invoke({});

    // Assert
    expect(execution).toEqual({
      status: "cancelled",
      exitCode: 130,
      failure: {kind: "cancelled", message: "Command cancelled.", evidence: []},
    });
  });

  it("legacyInvoker defaults to the Node layer", async () => {
    // Arrange
    const invoker = legacyInvoker(
      "bridge",
      () => Effect.as(Effect.service(OutputSettings), {ok: true}),
      () => 0,
    );

    // Act
    const execution = await invoker.invoke({});

    // Assert
    expect(execution).toEqual({status: "completed", exitCode: 0, value: {ok: true}});
  });

  it("legacyInvoker follows the parent runtime signal", async () => {
    // Arrange
    const runtime = await createTestRuntimeFactory().createRoot({
      presentation: "silent",
      registerProcessSignals: false,
      signal: AbortSignal.abort(),
    });
    const invoker = legacyInvoker(
      "bridge",
      () => Effect.never,
      () => 0,
      recordingFactory().makeLayer,
    );

    // Act
    const execution = await invoker.invoke({}, {parent: {runtime, presentation: "silent"}});
    await runtime.cleanup.drain();

    // Assert
    expect(execution.status).toBe("cancelled");
    expect(execution.exitCode).toBe(130);
    expect(execution.status === "cancelled" ? execution.failure.cause : undefined).toBeInstanceOf(CommandCancellation);
  });
});
