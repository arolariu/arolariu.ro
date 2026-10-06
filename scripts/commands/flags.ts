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
import {commandLayer, type BaseServices, type CommandServices} from "../platform/layers.ts";
import {resolveColor, withLogContext} from "../platform/Output.ts";

/** `--json`: emit one machine-readable JSON document instead of human output. */
export const JsonFlag: GlobalFlag.Setting<"json", boolean> = GlobalFlag.Setting("json")({
  flag: Flag.Boolean("json").pipe(Flag.withDefault(false), Flag.withDescription("Emit one machine-readable JSON document.")),
});

/** Values effect/cli accepts as `true` for a boolean flag (`--json=yes`, `--json on`, …). */
const TRUE_LITERALS: ReadonlySet<string> = new Set(["true", "yes", "on", "1", "y"]);
/** Values effect/cli accepts as `false` for a boolean flag. */
const FALSE_LITERALS: ReadonlySet<string> = new Set(["false", "no", "off", "0", "n"]);

/**
 * Decides from raw arguments whether an invocation requested {@link JsonFlag}, the way effect/cli parses it.
 *
 * @remarks
 * The CLI entry needs the mode to render failures that happen before or outside a command handler
 * (usage errors included), so it cannot read the parsed setting. Mirrors the effect/cli 4.0.0
 * lexer and boolean-flag parser: scanning stops at `--` (every later token is a passthrough
 * operand); `--json` means `true` unless the next token is a boolean literal, which it then
 * consumes (`--json false`); `--json=<literal>` sets the literal; `--no-json` means `false`; the
 * first occurrence wins; and an invalid inline value (`--json=maybe`, a usage error) counts as not requested.
 *
 * @param argv - Arguments after the program name.
 * @returns Whether the invocation runs in JSON mode.
 */
export function requestsJsonOutput(argv: readonly string[]): boolean {
  for (const [index, argument] of argv.entries()) {
    if (argument === "--") {
      return false;
    }
    if (argument === "--no-json") {
      return false;
    }
    if (argument === "--json") {
      return !FALSE_LITERALS.has(argv[index + 1] ?? "");
    }
    if (argument.startsWith("--json=")) {
      return TRUE_LITERALS.has(argument.slice("--json=".length));
    }
  }
  return false;
}

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
 * and sets the `[arolariu::<context>]` log context.
 *
 * @param context - Default `[arolariu::<context>]` prefix of the command's log lines.
 * @returns A function that provides `OutputSettings`, `Presenter`, `Process`, and `Inspection` to a program.
 */
export function withCommandOutput(
  context: string,
): <A, E, R>(
  self: Effect.Effect<A, E, R>,
) => Effect.Effect<A, E, Exclude<R, CommandServices> | CommandOutputServices> {
  return <A, E, R>(
    self: Effect.Effect<A, E, R>,
  ): Effect.Effect<A, E, Exclude<R, CommandServices> | CommandOutputServices> =>
    Effect.gen(function* () {
      const json = yield* JsonFlag;
      const verbose = yield* VerboseFlag;
      const environment = yield* Environment;
      const layer = commandLayer({mode: json ? "json" : "human", verbose, color: resolveColor(environment), context});
      return yield* self.pipe(withLogContext(context), Effect.provide(layer));
    });
}
