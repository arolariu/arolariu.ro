// @vitest-environment node
/**
 * @fileoverview Tests for the production Effect layer composition of the scripts tooling.
 * @module scripts/platform/layers.test
 *
 * @remarks
 * Builds {@link makeNodeLayer} and resolves every platform service from it. Building the layer only
 * snapshots the ambient environment and constructs the Node adapters; no test spawns a process,
 * writes a file, or issues a request.
 */

import {Effect, FileSystem, Path} from "effect";
import {describe, expect, it} from "vitest";

import {Environment} from "./Environment.ts";
import {GetOnlyHttp, Glob, ReadOnlyFiles} from "./Files.ts";
import {makeNodeLayer} from "./layers.ts";
import {OutputSettings, Presenter} from "./Output.ts";
import {Process} from "./Process.ts";
import {runScoped} from "./testing.ts";

describe("makeNodeLayer", () => {
  it("makeNodeLayer builds every platform service", async () => {
    // Arrange
    const settings = {mode: "silent", verbose: false, color: false, context: "layers"} as const;
    const program = Effect.gen(function* () {
      yield* Environment;
      yield* Process;
      yield* Presenter;
      yield* Glob;
      yield* ReadOnlyFiles;
      yield* GetOnlyHttp;
      yield* FileSystem.FileSystem;
      yield* Path.Path;
      return yield* OutputSettings;
    });

    // Act
    const resolved = await runScoped(program, makeNodeLayer(settings));

    // Assert
    expect(resolved).toEqual(settings);
  });
});
