/**
 * @fileoverview Global effect/cli flags and the per-command output wrapper.
 * @module scripts/commands/flags
 *
 * @remarks
 * {@link JsonFlag} and {@link VerboseFlag} are root-level settings, accepted before or after the
 * subcommand. `-v` stays effect/cli's built-in `--version` alias, so `--verbose` has no short form.
 * Every command handler wraps its program in {@link withCommandOutput}, which turns both settings
 * and the ambient {@link Environment} into the invocation's `commandLayer`.
 */

import {Effect, Option} from "effect";
import {Flag, GlobalFlag} from "effect/cli";

import type {ContainerEngine} from "../container-runtime/types.ts";
import {Environment} from "../platform/Environment.ts";
import {commandLayer, type BaseServices} from "../platform/layers.ts";
import {resolveColor, withLogContext, type OutputSettings, type Presenter} from "../platform/Output.ts";
import {Process} from "../platform/Process.ts";

/** `--json`: emit one machine-readable JSON document instead of human output. */
export const JsonFlag: GlobalFlag.Setting<"json", boolean> = GlobalFlag.Setting("json")({
  flag: Flag.Boolean("json").pipe(Flag.withDefault(false), Flag.withDescription("Emit one machine-readable JSON document.")),
});

/** `--verbose`: also emit debug diagnostics. */
export const VerboseFlag: GlobalFlag.Setting<"verbose", boolean> = GlobalFlag.Setting("verbose")({
  flag: Flag.Boolean("verbose").pipe(Flag.withDefault(false), Flag.withDescription("Show diagnostic output.")),
});

/** `--engine <rancher|podman>`: optional container engine selection. */
export const EngineFlag: Flag.Flag<Option.Option<ContainerEngine>> = Flag.Literals("engine", ["rancher", "podman"]).pipe(
  Flag.optional,
  Flag.withDescription("Container engine: rancher or podman."),
);

/**
 * Converts a parsed {@link EngineFlag} into the optional `engine` field of a legacy input.
 *
 * @param engine - The parsed engine option.
 * @returns `{engine}` when an engine was selected, otherwise `{}` (the key is omitted, as
 * `exactOptionalPropertyTypes` requires).
 */
export function engineInput(engine: Option.Option<ContainerEngine>): {readonly engine?: ContainerEngine} {
  return Option.match(engine, {onNone: () => ({}), onSome: (selected) => ({engine: selected})});
}

/** Services one wrapped command program additionally requires. */
type CommandOutputServices = BaseServices | GlobalFlag.Setting.Identifier<"json"> | GlobalFlag.Setting.Identifier<"verbose">;

/**
 * Provides the per-invocation output services to a command program.
 *
 * @remarks
 * Reads {@link JsonFlag}, {@link VerboseFlag}, and {@link Environment}, then provides
 * `commandLayer({mode: json ? "json" : "human", verbose, color: resolveColor(environment), context})`
 * and sets the `[arolariu::<context>]` log context. A `Process` already present in the ambient
 * context (the scripted process of the test harness; production base layers have none) is kept in
 * place of the layer's `ProcessLive`.
 *
 * @param context - Default `[arolariu::<context>]` prefix of the command's log lines.
 * @returns A function that provides `OutputSettings`, `Presenter`, and `Process` to a program.
 */
export function withCommandOutput(
  context: string,
): <A, E, R>(
  self: Effect.Effect<A, E, R>,
) => Effect.Effect<A, E, Exclude<R, OutputSettings | Presenter | Process> | CommandOutputServices> {
  return <A, E, R>(
    self: Effect.Effect<A, E, R>,
  ): Effect.Effect<A, E, Exclude<R, OutputSettings | Presenter | Process> | CommandOutputServices> =>
    Effect.gen(function* () {
      const json = yield* JsonFlag;
      const verbose = yield* VerboseFlag;
      const environment = yield* Environment;
      const layer = commandLayer({mode: json ? "json" : "human", verbose, color: resolveColor(environment), context});
      const ambientProcess = yield* Effect.serviceOption(Process);
      const program = Option.match(ambientProcess, {
        onNone: () => self,
        onSome: (process) => self.pipe(Effect.provideService(Process, process)),
      });
      return yield* program.pipe(withLogContext(context), Effect.provide(layer));
    });
}
