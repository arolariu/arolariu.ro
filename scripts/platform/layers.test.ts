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

import {Effect, FileSystem, Layer, Path} from "effect";
import {describe, expect, it} from "vitest";

import {Environment} from "./Environment.ts";
import {GetOnlyHttp, Glob, ReadOnlyFiles} from "./Files.ts";
import {commandLayer, makeNodeLayer, NodeBaseLayer} from "./layers.ts";
import {OutputSettings, Presenter, type OutputSettingsShape} from "./Output.ts";
import {Process, ProcessLayerFactory} from "./Process.ts";
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

describe("commandLayer", () => {
  it("builds Process from the ProcessLayerFactory reference over the invocation output settings", async () => {
    // Arrange
    const settings = {mode: "human", verbose: true, color: false, context: "layers"} as const;
    const seen: OutputSettingsShape[] = [];
    const factory = Layer.effect(
      Process,
      Effect.map(Effect.service(OutputSettings), (current) => {
        seen.push(current);
        return Process.of({run: () => Effect.succeed({stdout: "scripted", stderr: "", durationMs: 0})});
      }),
    );
    const program = Effect.gen(function* () {
      const process = yield* Process;
      return yield* process.run({command: "tool", args: []});
    }).pipe(Effect.provide(commandLayer(settings)), Effect.provideService(ProcessLayerFactory, factory));

    // Act
    const result = await runScoped(program, NodeBaseLayer);

    // Assert
    expect(result.stdout).toBe("scripted");
    expect(seen).toEqual([settings]);
  });
});
