/**
 * @fileoverview Effect `Prompts` service: interactive confirm, select, text, and secret prompts.
 * @module scripts/platform/Prompts
 *
 * @remarks
 * Effect counterpart of the legacy `PromptProvider` (`scripts/common/prompts.ts`). Without an
 * interactive stdin, `confirm` and `select` return their default when one is given and every other
 * prompt fails with {@link PromptUnavailable}, whose message is identical to the legacy
 * non-interactive error. The check happens before any effect/cli `Prompt` runs, because those
 * prompts would otherwise read piped stdin and fail only at end of input. `secret` returns a
 * `Redacted<string>`, so the value stays redacted until the caller that needs it unwraps it.
 */

import {Context, Effect, Layer, Schema, type FileSystem, type Path, type Redacted, type Terminal} from "effect";
import {Prompt} from "effect/cli";

import {Environment} from "./Environment.ts";

/** The prompt operation that could not run. */
export type PromptKind = "confirm" | "select" | "text" | "secret";

/** Raised when a prompt needs an interactive terminal and stdin is not one. */
export class PromptUnavailable extends Schema.TaggedError<PromptUnavailable>()("PromptUnavailable", {
  message: Schema.String,
  kind: Schema.Literals(["confirm", "select", "text", "secret"]),
}) {}

/** One selectable prompt value and its human-readable label. */
export interface PromptChoice<T extends string> {
  /** Value returned when this choice is selected. */
  readonly value: T;
  /** Human-readable choice label. */
  readonly label: string;
}

/** Interactive prompt operations. */
export interface PromptsShape {
  /** Requests a yes/no decision; without a TTY it returns `defaultValue` when one is given. */
  readonly confirm: (message: string, defaultValue?: boolean) => Effect.Effect<boolean, PromptUnavailable | Terminal.QuitError>;
  /** Requests one value from a fixed set of choices; without a TTY it returns `defaultValue` when one is given. */
  readonly select: <T extends string>(
    message: string,
    choices: readonly PromptChoice<T>[],
    defaultValue?: T,
  ) => Effect.Effect<T, PromptUnavailable | Terminal.QuitError>;
  /** Requests visible free-form text. */
  readonly text: (message: string) => Effect.Effect<string, PromptUnavailable | Terminal.QuitError>;
  /** Requests secret text without echoing it; the value is returned redacted. */
  readonly secret: (message: string) => Effect.Effect<Redacted.Redacted<string>, PromptUnavailable | Terminal.QuitError>;
}

/** Service tag for the interactive {@link PromptsShape}. */
export class Prompts extends Context.Service<Prompts, PromptsShape>()("arolariu/scripts/Prompts") {}

/** The noun each prompt kind uses in the legacy non-interactive error message. */
const LEGACY_PROMPT_NOUNS: Readonly<Record<PromptKind, string>> = {
  confirm: "confirmation",
  select: "a selection",
  text: "text input",
  secret: "a secret",
};

/**
 * Builds the failure of a prompt that needs an interactive terminal.
 *
 * @param kind - The prompt operation.
 * @returns A {@link PromptUnavailable} whose message equals the legacy non-interactive error.
 */
export function promptUnavailable(kind: PromptKind): PromptUnavailable {
  return new PromptUnavailable({
    kind,
    message: `Cannot request ${LEGACY_PROMPT_NOUNS[kind]} without an interactive terminal. Re-run setup in a TTY.`,
  });
}

/**
 * Rejects a select prompt without choices, which is a caller invariant violation.
 *
 * @param choices - The offered choices.
 * @returns An effect that dies when `choices` is empty.
 */
export function requireChoices(choices: readonly PromptChoice<string>[]): Effect.Effect<void> {
  return choices.length === 0 ? Effect.die(new Error("A select prompt requires at least one choice.")) : Effect.void;
}

/** Live prompts over the effect/cli `Prompt` module, guarded by the {@link Environment} TTY flag. */
export const PromptsLive: Layer.Layer<Prompts, never, Terminal.Terminal | Environment | FileSystem.FileSystem | Path.Path> = Layer.effect(
  Prompts,
  Effect.gen(function* () {
    const environment = yield* Environment;
    const context = yield* Effect.context<Terminal.Terminal | FileSystem.FileSystem | Path.Path>();
    const run = <A>(kind: PromptKind, prompt: () => Prompt.Prompt<A>): Effect.Effect<A, PromptUnavailable | Terminal.QuitError> =>
      environment.stdinIsTTY
        ? Effect.suspend(() => Prompt.run(prompt())).pipe(Effect.provideContext(context))
        : Effect.fail(promptUnavailable(kind));

    return Prompts.of({
      confirm: (message, defaultValue) =>
        !environment.stdinIsTTY && defaultValue !== undefined
          ? Effect.succeed(defaultValue)
          : run("confirm", () => Prompt.Confirm({message, ...(defaultValue === undefined ? {} : {initial: defaultValue})})),
      select: <T extends string>(message: string, choices: readonly PromptChoice<T>[], defaultValue?: T) =>
        Effect.andThen(
          requireChoices(choices),
          !environment.stdinIsTTY && defaultValue !== undefined
            ? Effect.succeed(defaultValue)
            : run("select", () =>
                Prompt.Select<T>({
                  message,
                  choices: choices.map((choice) => ({title: choice.label, value: choice.value, selected: choice.value === defaultValue})),
                }),
              ),
        ),
      text: (message) => run("text", () => Prompt.String({message})),
      secret: (message) => run("secret", () => Prompt.Password({message})),
    });
  }),
);
