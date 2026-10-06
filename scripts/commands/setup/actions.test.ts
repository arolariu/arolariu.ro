// @vitest-environment node
/**
 * @fileoverview Tests for the consent-gated `SetupActions` service.
 * @module scripts/commands/setup/actions.test
 *
 * @remarks
 * Each case runs `setupActionsLayer(options)` over the in-memory harness: scripted prompts follow
 * the `PromptsLive` TTY rule, and every rendered line is read from the recording sink.
 */

import {Effect, Layer, Redacted, Terminal} from "effect";
import {describe, expect} from "vitest";

import type {PlatformServices} from "../../platform/layers.ts";
import {Prompts} from "../../platform/Prompts.ts";
import {effectTest, makeTestLayer, type TestHarness} from "../../platform/testing.ts";
import {SetupActions, setupActionsLayer} from "./actions.ts";
import {SetupActionFailed} from "./errors.ts";
import type {SetupAction, SetupActionScope, SetupInput} from "./types.ts";

/** Builds a setup input. */
function options(patch: Partial<SetupInput> = {}): SetupInput {
  return {verbose: false, dryRun: false, yes: false, ...patch};
}

/** One action `a` with summary `s` whose execution is recorded. */
function recordedAction(scope: SetupActionScope, executed: string[]): SetupAction {
  return {
    id: "a",
    scope,
    summary: "s",
    execute: Effect.sync(() => {
      executed.push("a");
    }),
  };
}

/** Every sink record as `<stream>: <line>`. */
function lines(harness: Pick<TestHarness, "output">): readonly string[] {
  return harness.output().map(({stream, text}) => `${stream}: ${text.replace(/\n$/u, "")}`);
}

/**
 * Builds the harness and the layer providing {@link SetupActions} over it.
 *
 * @param input - The setup input.
 * @param stdinIsTTY - Whether prompts may read scripted answers.
 * @param prompts - Scripted prompt answers.
 * @returns The harness and the layer.
 */
function actionsHarness(
  input: SetupInput,
  stdinIsTTY: boolean,
  prompts: readonly boolean[] = [],
): Readonly<{harness: TestHarness; layer: Layer.Layer<SetupActions | PlatformServices>}> {
  const harness = makeTestLayer({environment: {stdinIsTTY}, prompts, context: "test"});
  return {harness, layer: setupActionsLayer(input).pipe(Layer.provideMerge(harness.layer))};
}

describe("setupActionsLayer", () => {
  {
    const executed: string[] = [];
    const {harness, layer} = actionsHarness(options({dryRun: true}), false);
    effectTest(
      "plans in dry-run",
      () =>
        Effect.gen(function* () {
          // Act
          const disposition = yield* (yield* SetupActions).run(recordedAction("system", executed));

          // Assert
          expect(disposition).toBe("planned");
          expect(executed).toEqual([]);
          expect(lines(harness)).toEqual(["stdout: [arolariu::setup] ℹ️ Planned setup action 'a' (system): s"]);
        }),
      layer,
    );
  }

  {
    const executed: string[] = [];
    const {harness, layer} = actionsHarness(options({dryRun: true, yes: true}), true);
    effectTest(
      "dry-run wins over yes",
      () =>
        Effect.gen(function* () {
          // Act
          const disposition = yield* (yield* SetupActions).run(recordedAction("system", executed));

          // Assert
          expect(disposition).toBe("planned");
          expect(executed).toEqual([]);
          expect(lines(harness)).toEqual(["stdout: [arolariu::setup] ℹ️ Planned setup action 'a' (system): s"]);
        }),
      layer,
    );
  }

  {
    const executed: string[] = [];
    const {harness, layer} = actionsHarness(options(), false);
    effectTest(
      "executes repository actions without prompting",
      () =>
        Effect.gen(function* () {
          // Act
          const disposition = yield* (yield* SetupActions).run(recordedAction("repository", executed));

          // Assert
          expect(disposition).toBe("executed");
          expect(executed).toEqual(["a"]);
          expect(lines(harness)).toEqual(["stdout: [arolariu::setup] ✅ Executed setup action 'a' (repository): s"]);
        }),
      layer,
    );
  }

  {
    const executed: string[] = [];
    const {harness, layer} = actionsHarness(options(), false);
    effectTest(
      "executes user actions without prompting",
      () =>
        Effect.gen(function* () {
          // Act
          const disposition = yield* (yield* SetupActions).run(recordedAction("user", executed));

          // Assert
          expect(disposition).toBe("executed");
          expect(executed).toEqual(["a"]);
          expect(lines(harness)).toEqual(["stdout: [arolariu::setup] ✅ Executed setup action 'a' (user): s"]);
        }),
      layer,
    );
  }

  {
    const executed: string[] = [];
    const {harness, layer} = actionsHarness(options(), true, [false]);
    effectTest(
      "asks for system consent",
      () =>
        Effect.gen(function* () {
          // Act
          const disposition = yield* (yield* SetupActions).run(recordedAction("system", executed));

          // Assert
          expect(disposition).toBe("declined");
          expect(executed).toEqual([]);
          expect(lines(harness)).toEqual(["stderr: [arolariu::setup] ⚠️ Declined setup action 'a' (system): s"]);
        }),
      layer,
    );
  }

  {
    const executed: string[] = [];
    const {harness, layer} = actionsHarness(options(), true, [true]);
    effectTest(
      "executes a system action after consent",
      () =>
        Effect.gen(function* () {
          // Act
          const disposition = yield* (yield* SetupActions).run(recordedAction("system", executed));

          // Assert
          expect(disposition).toBe("executed");
          expect(executed).toEqual(["a"]);
          expect(lines(harness)).toEqual(["stdout: [arolariu::setup] ✅ Executed setup action 'a' (system): s"]);
        }),
      layer,
    );
  }

  {
    const executed: string[] = [];
    const {harness, layer} = actionsHarness(options({yes: true}), true);
    effectTest(
      "yes skips system consent",
      () =>
        Effect.gen(function* () {
          // Act (an unscripted TTY prompt would die)
          const disposition = yield* (yield* SetupActions).run(recordedAction("system", executed));

          // Assert
          expect(disposition).toBe("executed");
          expect(executed).toEqual(["a"]);
          expect(lines(harness)).toEqual(["stdout: [arolariu::setup] ✅ Executed setup action 'a' (system): s"]);
        }),
      layer,
    );
  }

  {
    const executed: string[] = [];
    const {harness, layer} = actionsHarness(options(), false);
    effectTest(
      "resolves system consent without a TTY like legacy",
      () =>
        Effect.gen(function* () {
          // Act: the defaulted confirmation resolves `false` without reading input (R1 pin).
          const disposition = yield* (yield* SetupActions).run(recordedAction("system", executed));

          // Assert
          expect(disposition).toBe("declined");
          expect(executed).toEqual([]);
          expect(lines(harness)).toEqual(["stderr: [arolariu::setup] ⚠️ Declined setup action 'a' (system): s"]);
        }),
      layer,
    );
  }

  {
    const {harness, layer} = actionsHarness(options(), false);
    effectTest(
      "propagates an action failure without logging its potentially secret details",
      () =>
        Effect.gen(function* () {
          // Arrange
          const failure = new SetupActionFailed({message: "do-not-log-this-secret", actionId: "a"});
          const action: SetupAction = {id: "a", scope: "repository", summary: "s", execute: Effect.fail(failure)};

          // Act
          const error = yield* Effect.flip((yield* SetupActions).run(action));

          // Assert
          expect(error).toBe(failure);
          expect(harness.output()).toEqual([]);
        }),
      layer,
    );
  }

  {
    const executed: string[] = [];
    const harness = makeTestLayer({environment: {stdinIsTTY: true}});
    const quitting = Prompts.of({
      confirm: () => Effect.fail(new Terminal.QuitError()),
      select: () => Effect.die(new Error("unexpected select")),
      text: () => Effect.die(new Error("unexpected text")),
      secret: () => Effect.succeed(Redacted.make("")),
    });
    const layer = setupActionsLayer(options()).pipe(Layer.provideMerge(Layer.merge(harness.layer, Layer.succeed(Prompts, quitting))));
    effectTest(
      "propagates a terminal quit at the consent prompt without executing",
      () =>
        Effect.gen(function* () {
          // Act
          const error = yield* Effect.flip((yield* SetupActions).run(recordedAction("system", executed)));

          // Assert
          expect(Terminal.isQuitError(error)).toBe(true);
          expect(executed).toEqual([]);
          expect(harness.output()).toEqual([]);
        }),
      layer,
    );
  }
});
