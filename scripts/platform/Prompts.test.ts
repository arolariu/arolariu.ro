// @vitest-environment node
/**
 * @fileoverview Tests for the Effect `Prompts` service and its scripted harness counterpart.
 * @module scripts/platform/Prompts.test
 *
 * @remarks
 * The non-TTY messages are pinned to the exact text the retired legacy terminal prompt provider
 * rejected with. The interactive paths run `PromptsLive` over a scripted `Terminal` whose input
 * queue replays key presses.
 */

import {Cause, Effect, Exit, Layer, Option, Queue, Redacted, Terminal} from "effect";
import {describe, expect, it} from "vitest";

import {Prompts, PromptsLive, PromptUnavailable, type PromptKind, type PromptsShape} from "./Prompts.ts";
import {makeTestLayer, runScoped} from "./testing.ts";

/** Exact non-TTY rejection messages of the retired legacy terminal prompt provider. */
const legacyNonInteractiveMessages: Readonly<Record<PromptKind, string>> = {
  confirm: "Cannot request confirmation without an interactive terminal. Re-run setup in a TTY.",
  select: "Cannot request a selection without an interactive terminal. Re-run setup in a TTY.",
  text: "Cannot request text input without an interactive terminal. Re-run setup in a TTY.",
  secret: "Cannot request a secret without an interactive terminal. Re-run setup in a TTY.",
};

/**
 * Builds a terminal that replays the given key presses and then ends its input.
 *
 * @param keys - Key presses, either a printable character or a named key such as `"enter"`.
 * @returns A terminal layer that records displayed frames into `frames`.
 */
function scriptedTerminal(keys: readonly string[]): {readonly layer: Layer.Layer<Terminal.Terminal>; readonly frames: string[]} {
  const frames: string[] = [];
  const terminal = Terminal.make({
    columns: Effect.succeed(80),
    rows: Effect.succeed(24),
    readInput: Effect.gen(function* () {
      const queue = yield* Queue.unbounded<Terminal.UserInput, Cause.Done>();
      yield* Queue.offerAll(
        queue,
        keys.map((key) => ({
          input: key.length === 1 ? Option.some(key) : Option.none(),
          key: {name: key, ctrl: false, meta: false, shift: false},
        })),
      );
      yield* Queue.end(queue);
      return queue;
    }),
    readLine: Effect.die(new Error("unexpected readLine")),
    display: (text) =>
      Effect.sync(() => {
        frames.push(text);
      }),
  });
  return {layer: Layer.succeed(Terminal.Terminal, terminal), frames};
}

/**
 * Builds the live prompt layer over a TTY harness and a scripted terminal.
 *
 * @param keys - Key presses replayed by the terminal.
 * @returns A layer providing only the live {@link Prompts}.
 */
function livePrompts(keys: readonly string[]): Layer.Layer<Prompts> {
  const harness = makeTestLayer({environment: {stdinIsTTY: true}});
  return PromptsLive.pipe(Layer.provide(scriptedTerminal(keys).layer), Layer.provide(harness.layer));
}

/**
 * Runs one prompt operation and returns its exit.
 *
 * @param ask - Invokes the operation on the service.
 * @param layer - Provides {@link Prompts}.
 * @returns The exit of the operation.
 */
function exitOf<A, E>(ask: (prompts: PromptsShape) => Effect.Effect<A, E>, layer: Layer.Layer<Prompts>): Promise<Exit.Exit<A, E>> {
  return runScoped(Effect.exit(Effect.flatMap(Prompts, ask)), layer);
}

describe("PromptsLive", () => {
  it("fails with PromptUnavailable when stdin is not a TTY", async () => {
    // Arrange
    const layer = PromptsLive.pipe(Layer.provide(makeTestLayer().layer));
    const legacy = legacyNonInteractiveMessages.confirm;

    // Act
    const exit = await exitOf((prompts) => prompts.confirm("x"), layer);

    // Assert
    expect(exit).toEqual(Exit.fail(new PromptUnavailable({kind: "confirm", message: legacy})));
    expect(legacy).toBe("Cannot request confirmation without an interactive terminal. Re-run setup in a TTY.");
  });

  type Ask = (prompts: PromptsShape) => Effect.Effect<unknown, PromptUnavailable | Terminal.QuitError>;
  const nonInteractiveCases: readonly (readonly [PromptKind, Ask])[] = [
    ["select", (prompts) => prompts.select("x", [{value: "a", label: "A"}])],
    ["text", (prompts) => prompts.text("x")],
    ["secret", (prompts) => prompts.secret("x")],
  ];

  it.each(nonInteractiveCases)("fails %s with the legacy non-interactive message without a TTY", async (kind, ask) => {
    // Arrange
    const layer = PromptsLive.pipe(Layer.provide(makeTestLayer().layer));
    const legacy = legacyNonInteractiveMessages[kind];

    // Act
    const exit = await exitOf(ask, layer);

    // Assert
    expect(exit).toEqual(Exit.fail(new PromptUnavailable({kind, message: legacy})));
  });

  it("returns the default of a confirm or select without a TTY, like the legacy provider", async () => {
    // Arrange
    const layer = PromptsLive.pipe(Layer.provide(makeTestLayer().layer));

    // Act
    const confirmed = await runScoped(
      Effect.flatMap(Prompts, (prompts) => prompts.confirm("x", true)),
      layer,
    );
    const selected = await runScoped(
      Effect.flatMap(Prompts, (prompts) =>
        prompts.select(
          "x",
          [
            {value: "a", label: "A"},
            {value: "b", label: "B"},
          ],
          "b",
        ),
      ),
      layer,
    );

    // Assert
    expect(confirmed).toBe(true);
    expect(selected).toBe("b");
  });

  it("dies when a select has no choices", async () => {
    // Arrange
    const layer = PromptsLive.pipe(Layer.provide(makeTestLayer().layer));

    // Act
    const exit = await exitOf((prompts) => prompts.select("x", []), layer);

    // Assert
    expect(Exit.isFailure(exit) && Cause.hasDies(exit.cause)).toBe(true);
  });

  it("reads a confirmation from the terminal in a TTY", async () => {
    // Act
    const confirmed = await runScoped(
      Effect.flatMap(Prompts, (prompts) => prompts.confirm("Continue?")),
      livePrompts(["y"]),
    );

    // Assert
    expect(confirmed).toBe(true);
  });

  it("reads text, a secret, and a selection from the terminal in a TTY", async () => {
    // Act
    const text = await runScoped(
      Effect.flatMap(Prompts, (prompts) => prompts.text("Name")),
      livePrompts(["a", "b", "enter"]),
    );
    const secret = await runScoped(
      Effect.flatMap(Prompts, (prompts) => prompts.secret("Token")),
      livePrompts(["s", "enter"]),
    );
    const selected = await runScoped(
      Effect.flatMap(Prompts, (prompts) =>
        prompts.select(
          "Pick",
          [
            {value: "a", label: "A"},
            {value: "b", label: "B"},
          ],
          "b",
        ),
      ),
      livePrompts(["enter"]),
    );

    // Assert
    expect(text).toBe("ab");
    expect(Redacted.value(secret)).toBe("s");
    expect(selected).toBe("b");
  });

  it("fails with QuitError when terminal input ends before an answer", async () => {
    // Act
    const exit = await exitOf((prompts) => prompts.text("Name"), livePrompts([]));

    // Assert
    expect(Exit.isFailure(exit) && Terminal.isQuitError(Cause.squash(exit.cause))).toBe(true);
  });
});

describe("harness Prompts", () => {
  it("harness consumes scripted answers in order", async () => {
    // Arrange
    const harness = makeTestLayer({environment: {stdinIsTTY: true}, prompts: [true, "abc", "b", "plain"]});

    // Act
    const answers = await runScoped(
      Effect.gen(function* () {
        const prompts = yield* Prompts;
        const confirmed = yield* prompts.confirm("x");
        const secret = yield* prompts.secret("y");
        const selected = yield* prompts.select("z", [
          {value: "a", label: "A"},
          {value: "b", label: "B"},
        ]);
        const text = yield* prompts.text("w");
        return {confirmed, secret: Redacted.value(secret), selected, text};
      }),
      harness.layer,
    );

    // Assert
    expect(answers).toEqual({confirmed: true, secret: "abc", selected: "b", text: "plain"});
  });

  it("harness fails like the live service without a TTY", async () => {
    // Arrange
    const harness = makeTestLayer();
    const legacy = legacyNonInteractiveMessages.text;

    // Act
    const exit = await exitOf((prompts) => prompts.text("x"), harness.layer);
    const defaulted = await runScoped(
      Effect.flatMap(Prompts, (prompts) => prompts.confirm("x", false)),
      harness.layer,
    );

    // Assert
    expect(exit).toEqual(Exit.fail(new PromptUnavailable({kind: "text", message: legacy})));
    expect(defaulted).toBe(false);
  });

  it("harness dies on an unscripted prompt", async () => {
    // Arrange
    const harness = makeTestLayer({environment: {stdinIsTTY: true}});

    // Act
    const failure = runScoped(
      Effect.flatMap(Prompts, (prompts) => prompts.text("x")),
      harness.layer,
    );

    // Assert
    await expect(failure).rejects.toThrow("unscripted prompt: x");
  });

  it("harness dies when a scripted answer has the wrong type or is not a choice", async () => {
    // Arrange
    const wrongType = makeTestLayer({environment: {stdinIsTTY: true}, prompts: ["yes"]});
    const notAChoice = makeTestLayer({environment: {stdinIsTTY: true}, prompts: ["c"]});

    // Act
    const confirm = runScoped(
      Effect.flatMap(Prompts, (prompts) => prompts.confirm("x")),
      wrongType.layer,
    );
    const select = runScoped(
      Effect.flatMap(Prompts, (prompts) => prompts.select("y", [{value: "a", label: "A"}])),
      notAChoice.layer,
    );

    // Assert
    await expect(confirm).rejects.toThrow("scripted prompt answer for x is not a boolean");
    await expect(select).rejects.toThrow("scripted prompt answer for y is not one of its choices");
  });
});
