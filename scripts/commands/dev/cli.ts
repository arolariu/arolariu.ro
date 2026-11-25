/**
 * @fileoverview effect/cli `dev` command group running the Effect Aspire and selfhost programs.
 * @module scripts/commands/dev/cli
 *
 * @remarks
 * `dev` has no handler of its own, so running it alone prints help. `dev aspire` decodes `--engine`
 * into a {@link ContainerEngineInput} and runs {@link runAspire}; `dev selfhost [start|stop|logs]`
 * (default `start`) decodes the action and `--engine` into a {@link SelfhostInput} and runs
 * {@link runSelfhost} with the {@link LocalBlobStorageLive} layer, which only this handler provides.
 * Each renders its result as the single JSON document (`--json`) or the legacy success line; a
 * non-zero exit of a child whose output the user already saw becomes `ReportedFailure{exitCode: 1}`
 * through {@link reportChildExit}.
 */

import {Effect, type Layer, Option} from "effect";
import {Argument, Command, Flag} from "effect/cli";

import type {CliSubcommand} from "../../cli.ts";
import {runAspire} from "../../container-runtime/aspire.ts";
import {LocalBlobStorageLive, type LocalBlobStorage} from "../../container-runtime/selfhost.bootstrap.ts";
import {runSelfhost} from "../../container-runtime/selfhost.ts";
import type {ContainerEngineInput, SelfhostAction, SelfhostInput} from "../../container-runtime/types.ts";
import {inspectWorktreeLaunch, stopWorktreeLaunch} from "../../container-runtime/worktreeAspire.ts";
import {isWorktreeRunId, readWorktreeLaunch, WorktreePlatform} from "../../container-runtime/worktreeLease.ts";
import {localWorktreePlatform} from "../../container-runtime/worktreePlatform.ts";
import {inspectWorktreeAspire} from "../../container-runtime/worktreePreflight.ts";
import {ReportedFailure} from "../../platform/exit.ts";
import {Presenter, toJsonValue} from "../../platform/Output.ts";
import {renderContainerCompletion, reportChildExit} from "../containers/output.ts";
import {EngineFlag, engineInput, withCommandOutput} from "../flags.ts";

/** Every action accepted by the `dev selfhost` `action` argument. */
const selfhostActions = ["start", "stop", "logs"] as const satisfies readonly SelfhostAction[];

/** Options of {@link makeDevCommand}. */
export interface DevCommandOptions {
  /** Blob storage layer `dev selfhost` provisions Azurite through; defaults to {@link LocalBlobStorageLive}. */
  readonly localBlobStorage?: Layer.Layer<LocalBlobStorage>;
}

/**
 * Builds the `dev` command group.
 *
 * @param options - Optional blob storage layer override; tests pass a recording layer.
 * @returns The `dev` group with its Aspire, Selfhost and worktree subcommands.
 */
export function makeDevCommand(options: DevCommandOptions = {}): CliSubcommand {
  const localBlobStorage = options.localBlobStorage ?? LocalBlobStorageLive;
  const aspire = Command.make("aspire", {engine: EngineFlag}, ({engine}) =>
    Effect.gen(function* () {
      const input: ContainerEngineInput = engineInput(engine);
      const result = yield* runAspire(input);
      yield* renderContainerCompletion(result, `Aspire AppHost exited successfully for engine '${result.engine}'.`);
    }).pipe(Effect.catchTag("ProcessExited", reportChildExit), withCommandOutput("aspire")),
  ).pipe(Command.withDescription("Starts the Aspire AppHost with the selected local container engine."));
  const selfhost = Command.make(
    "selfhost",
    {
      action: Argument.Literals("action", selfhostActions).pipe(
        Argument.withDescription("Selfhost action: start, stop, or logs."),
        Argument.withDefault("start"),
      ),
      engine: EngineFlag,
    },
    ({action, engine}) =>
      Effect.gen(function* () {
        const input: SelfhostInput = {action, ...engineInput(engine)};
        const result = yield* runSelfhost(input);
        yield* renderContainerCompletion(result, `Selfhost ${result.action} completed for engine '${result.engine}'.`);
      }).pipe(Effect.catchTag("ProcessExited", reportChildExit), Effect.provide(localBlobStorage), withCommandOutput("selfhost")),
  ).pipe(Command.withDescription("Runs selfhost container orchestration for the selected local engine."));
  const preflight = Command.make(
    "preflight",
    {
      engine: Flag.Literals("engine", ["podman"]).pipe(Flag.withDescription("Explicit Windows Podman engine selection.")),
      expectedRoot: Flag.String("expected-root").pipe(Flag.optional, Flag.withDescription("Expected canonical linked-worktree root.")),
    },
    ({engine, expectedRoot}) =>
      Effect.gen(function* () {
        const result = yield* inspectWorktreeAspire({
          engine,
          ...Option.match(expectedRoot, {onNone: () => ({}), onSome: (root) => ({expectedRoot: root})}),
        });
        const presenter = yield* Presenter;
        yield* Effect.orDie(presenter.json(toJsonValue(result)));
        yield* presenter.line("stdout", `Worktree Aspire preflight: ${result.status}. No AppHost or provider service was exercised.`);
        for (const {id, status, detail} of result.capabilities) {
          yield* presenter.line("stdout", `  ${id}: ${status} — ${detail}`);
        }
        if (result.status === "blocked") {
          return yield* new ReportedFailure({exitCode: 1, message: "Worktree Aspire preflight is blocked."});
        }
      }).pipe(withCommandOutput("worktree-preflight")),
  ).pipe(Command.withDescription("Inspects native Windows Aspire worktree prerequisites without preparing or launching anything."));
  const lifecycle = (action: "status" | "stop") => {
    const flags = {
      engine: Flag.Literals("engine", ["podman"]),
      ...(action === "stop"
        ? {expectedRun: Flag.String("expected-run").pipe(Flag.optional, Flag.withDescription("Refuse to stop a different run."))}
        : {}),
    };
    return Command.make(action, flags, ({expectedRun}) =>
      Effect.gen(function* () {
        const result = yield* Effect.gen(function* () {
          const runId = expectedRun === undefined ? undefined : Option.getOrUndefined(expectedRun);
          if (runId !== undefined && !isWorktreeRunId(runId))
            return {status: "blocked", reason: "The expected run ID is invalid."} as const;
          const platform = yield* localWorktreePlatform();
          const checkout = yield* platform.checkout;
          if (checkout === undefined)
            return {status: "blocked", reason: "Run from the current canonical Windows linked worktree."} as const;
          return yield* Effect.gen(function* () {
            const lease = yield* readWorktreeLaunch(checkout);
            if (!lease)
              return runId === undefined
                ? ({status: "idle"} as const)
                : ({status: "blocked", reason: "The expected scoped run is not current."} as const);
            if (lease.mode !== "aspire") return {status: "blocked", reason: "This is not a scoped Aspire lease."} as const;
            if (action === "stop") return yield* stopWorktreeLaunch(lease, runId);
            const status = yield* inspectWorktreeLaunch(lease);
            return status === "blocked"
              ? ({status, reason: "Run ownership could not be verified; no readiness is reported."} as const)
              : ({status, scopeId: lease.scopeId, runId: lease.runId} as const);
          }).pipe(Effect.provideService(WorktreePlatform, platform));
        }).pipe(Effect.catchTag("WorktreeLaunchError", ({message}) => Effect.succeed({status: "blocked", reason: message} as const)));
        const presenter = yield* Presenter;
        yield* Effect.orDie(presenter.json(toJsonValue(result)));
        yield* presenter.line(
          "stdout",
          `Worktree Aspire ${action}: ${result.status}.${"reason" in result ? ` ${result.reason}` : " No service readiness is implied."}`,
        );
        if (result.status === "blocked") return yield* new ReportedFailure({exitCode: 1, message: result.reason});
      }).pipe(withCommandOutput(`worktree-${action}`)),
    ).pipe(
      Command.withDescription(
        action === "status"
          ? "Reports this linked worktree's scoped ownership without probing service health."
          : "Stops only this linked worktree's verified scoped run, preserving volumes.",
      ),
    );
  };
  const worktree = Command.make("worktree").pipe(Command.withSubcommands([preflight, lifecycle("status"), lifecycle("stop")]));
  return Command.make("dev").pipe(
    Command.withDescription("Local development environments."),
    Command.withSubcommands([aspire, selfhost, worktree]),
  );
}
