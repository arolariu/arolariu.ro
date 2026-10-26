/**
 * @fileoverview Production Effect layer composition for the scripts tooling.
 * @module scripts/platform/layers
 *
 * @remarks
 * {@link NodeBaseLayer} wires every invocation-independent service to its Node adapter.
 * {@link commandLayer} adds the services that depend on the global output flags (and the
 * `Inspection` service, whose sessions run that invocation's processes), so the CLI builds it once
 * per invocation after parsing them; {@link makeNodeLayer} composes both. Tests use
 * `makeTestLayer` from `./testing.ts`, which provides the same {@link PlatformServices} in memory.
 */

import {NodeHttpClient, NodeServices} from "@effect/platform-node";
import {Effect, Layer, type FileSystem, type Path, type Terminal} from "effect";
import type {HttpClient} from "effect/http";
import type {ChildProcessSpawner} from "effect/process";

import {InspectionLayerFactory, type Inspection} from "../inspection/Inspection.ts";
import {EnvironmentLive, type Environment} from "./Environment.ts";
import {
  GetOnlyHttpLive,
  GlobLive,
  ReadOnlyFilesLive,
  TemporaryDirectoriesLive,
  type GetOnlyHttp,
  type Glob,
  type ReadOnlyFiles,
  type TemporaryDirectories,
} from "./Files.ts";
import {outputLayer, SinkLive, type OutputSettings, type OutputSettingsShape, type Presenter, type Sink} from "./Output.ts";
import {ProcessLayerFactory, type Process} from "./Process.ts";
import {PromptsLive, type Prompts} from "./Prompts.ts";

/** Services that do not depend on the invocation output settings. */
export type BaseServices =
  | Environment
  | FileSystem.FileSystem
  | Path.Path
  | ChildProcessSpawner.ChildProcessSpawner
  | Terminal.Terminal
  | HttpClient.HttpClient
  | Glob
  | ReadOnlyFiles
  | GetOnlyHttp
  | TemporaryDirectories
  | Prompts
  | Sink;

/** Services {@link commandLayer} builds for one invocation. */
export type CommandServices = OutputSettings | Presenter | Process | Inspection;

/** Every service a scripts command may require. */
export type PlatformServices = BaseServices | CommandServices;

/** Node adapters for every {@link BaseServices} member; output goes to the process streams. */
export const NodeBaseLayer: Layer.Layer<BaseServices> = Layer.mergeAll(
  ReadOnlyFilesLive,
  GetOnlyHttpLive,
  PromptsLive,
  TemporaryDirectoriesLive,
).pipe(Layer.provideMerge(Layer.mergeAll(NodeServices.layer, NodeHttpClient.layerUndici, GlobLive, EnvironmentLive, SinkLive)));

/**
 * Builds the per-invocation layer that depends on the global output flags.
 *
 * @param settings - The invocation output settings.
 * @returns The `outputLayer` for `settings` merged with the `Process` layer read from
 * {@link ProcessLayerFactory} (`ProcessLive` unless overridden), which it also feeds, and the
 * `Inspection` layer read from `InspectionLayerFactory` (`InspectionLive` unless overridden) over
 * that `Process`.
 */
export function commandLayer(settings: OutputSettingsShape): Layer.Layer<CommandServices, never, BaseServices> {
  // `fresh` keeps the layer memo map from reusing a Process (or the sessions of an Inspection) built for another invocation.
  const processLayer = Layer.unwrap(
    Effect.gen(function* () {
      return Layer.fresh(yield* ProcessLayerFactory);
    }),
  );
  const inspectionLayer = Layer.unwrap(
    Effect.gen(function* () {
      return Layer.fresh(yield* InspectionLayerFactory);
    }),
  );
  return inspectionLayer.pipe(Layer.provideMerge(processLayer), Layer.provideMerge(outputLayer(settings)));
}

/**
 * Builds the complete production layer for one invocation.
 *
 * @param settings - The invocation output settings.
 * @returns {@link commandLayer} provided with, and merged with, {@link NodeBaseLayer}.
 */
export function makeNodeLayer(settings: OutputSettingsShape): Layer.Layer<PlatformServices> {
  return commandLayer(settings).pipe(Layer.provideMerge(NodeBaseLayer));
}
