// @vitest-environment node
/**
 * @fileoverview Tests for the Effect test helpers shared by every scripts Effect suite.
 * @module scripts/platform/testing.test
 *
 * @remarks
 * Exercises {@link runScoped} and {@link effectTest} with in-memory effects and layers only: scope
 * finalization, typed-failure propagation, and layer provisioning. No test touches real I/O.
 */

import {Context, Effect, Layer, Schema} from "effect";
import {describe, expect, it} from "vitest";

import {effectTest, runScoped} from "./testing.ts";

class Probe extends Context.Service<Probe, {readonly n: number}>()("arolariu/scripts/Probe") {}

describe("runScoped", () => {
  it("resolves with the effect value after running its finalizers", async () => {
    // Arrange
    const events: string[] = [];
    const program = Effect.gen(function* () {
      yield* Effect.addFinalizer(() => Effect.sync(() => events.push("finalized")));
      return 42;
    });

    // Act
    const value = await runScoped(program, Layer.empty);

    // Assert
    expect(value).toBe(42);
    expect(events).toEqual(["finalized"]);
  });

  it("rejects with the original typed error", async () => {
    // Arrange
    class Boom extends Schema.TaggedError<Boom>()("Boom", {message: Schema.String}) {}

    // Act
    const result = runScoped(Effect.fail(new Boom({message: "x"})), Layer.empty);

    // Assert
    await expect(result).rejects.toMatchObject({_tag: "Boom", message: "x"});
  });
});

effectTest(
  "effectTest provides the layer",
  () =>
    Effect.gen(function* () {
      expect((yield* Probe).n).toBe(7);
    }),
  Layer.succeed(Probe, {n: 7}),
);
