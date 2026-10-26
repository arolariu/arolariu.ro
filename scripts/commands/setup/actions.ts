/**
 * @fileoverview The consent-gated `SetupActions` service every setup mutation runs through.
 * @module scripts/commands/setup/actions
 *
 * @remarks
 * {@link setupActionsLayer} is the sole place that decides whether a setup mutation runs. Its order
 * and messages are the legacy `createSetupActionExecutor`'s: `--dry-run` plans the action (and wins
 * over `--yes`), a `system` action without `--yes` asks for consent with a `false` default, and only
 * then is the action executed. Every action line carries the invocation context
 * `[arolariu::setup]`, never the context of the phase that submitted the action.
 */

import {Context, Effect, Layer, type PlatformError, type Terminal} from "effect";

import {Presenter, withLogContext} from "../../platform/Output.ts";
import type {ProcessError} from "../../platform/Process.ts";
import {Prompts, type PromptUnavailable} from "../../platform/Prompts.ts";
import type {SetupActionFailed} from "./errors.ts";
import type {SetupAction, SetupActionDisposition, SetupInput, SetupRequirements} from "./types.ts";

/** Log context of every action line: the setup invocation, not the submitting phase. */
const ACTION_LOG_CONTEXT = "setup";

/** Service tag for the consent-gated setup mutation runner. */
export class SetupActions extends Context.Service<
  SetupActions,
  {
    /**
     * Plans, declines, or executes one action according to the setup options.
     *
     * @remarks
     * A failure of the action itself, of its consent prompt (`PromptUnavailable`, or a terminal
     * quit), or an interruption propagates unchanged; no failure detail is logged.
     */
    readonly run: (
      action: SetupAction,
    ) => Effect.Effect<
      SetupActionDisposition,
      SetupActionFailed | ProcessError | PlatformError.PlatformError | PromptUnavailable | Terminal.QuitError,
      SetupRequirements
    >;
  }
>()("arolariu/scripts/SetupActions") {}

/**
 * Builds the {@link SetupActions} layer of one setup invocation.
 *
 * @remarks
 * For each action, with `metadata = '<id>' (<scope>): <summary>`:
 * - `dryRun` → `Planned setup action <metadata>` (info) → `"planned"`; nothing executes and nothing
 *   prompts, even with `yes`;
 * - `scope === "system"` without `yes` → `Prompts.confirm("Allow system setup action <metadata>?", false)`;
 *   a refusal logs `Declined setup action <metadata>` (warning, stderr) → `"declined"`. Without an
 *   interactive terminal the defaulted confirmation resolves `false`, so the action is declined;
 * - otherwise `action.execute` runs, then `Executed setup action <metadata>` (success) → `"executed"`.
 *
 * @param options - The setup input.
 * @returns A layer providing {@link SetupActions} over the invocation prompts and presenter.
 */
export function setupActionsLayer(options: SetupInput): Layer.Layer<SetupActions, never, Prompts | Presenter> {
  return Layer.effect(
    SetupActions,
    Effect.gen(function* () {
      const prompts = yield* Prompts;
      const presenter = yield* Presenter;
      const actionLine = withLogContext(ACTION_LOG_CONTEXT);

      const run = Effect.fn("setup.action")(function* (action: SetupAction) {
        const metadata = `'${action.id}' (${action.scope}): ${action.summary}`;

        if (options.dryRun) {
          yield* actionLine(Effect.logInfo(`Planned setup action ${metadata}`));
          return "planned" as const;
        }

        if (action.scope === "system" && !options.yes) {
          const confirmed = yield* prompts.confirm(`Allow system setup action ${metadata}?`, false);
          if (!confirmed) {
            yield* actionLine(Effect.logWarning(`Declined setup action ${metadata}`));
            return "declined" as const;
          }
        }

        yield* action.execute;
        yield* actionLine(presenter.success(`Executed setup action ${metadata}`));
        return "executed" as const;
      });

      return SetupActions.of({run});
    }),
  );
}
