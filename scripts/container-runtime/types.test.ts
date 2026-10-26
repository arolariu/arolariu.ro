/**
 * @fileoverview Tests for shared container runtime types.
 * @module scripts/container-runtime/types.test
 */

import {Effect, Exit} from "effect";
import {describe, expect, it} from "vitest";

import {ContainerRuntimeError} from "./types.ts";

describe("ContainerRuntimeError", () => {
  it("is a tagged Error carrying a stable name and the supplied message", () => {
    // Arrange & Act
    const error = new ContainerRuntimeError({message: "bad runtime"});

    // Assert
    expect(error).toBeInstanceOf(Error);
    expect(error._tag).toBe("ContainerRuntimeError");
    expect(error.name).toBe("ContainerRuntimeError");
    expect(error.message).toBe("bad runtime");
  });

  it("stays distinguishable from a plain Error for programmatic classification", () => {
    expect(new Error("bad runtime")).not.toBeInstanceOf(ContainerRuntimeError);
  });

  it("fails an Effect program as a typed failure when yielded", async () => {
    // Arrange
    const program = Effect.gen(function* () {
      return yield* new ContainerRuntimeError({message: "bad runtime"});
    });

    // Act
    const exit = await Effect.runPromiseExit(Effect.flip(program));

    // Assert
    expect(Exit.isSuccess(exit) ? exit.value : undefined).toEqual(new ContainerRuntimeError({message: "bad runtime"}));
  });
});
