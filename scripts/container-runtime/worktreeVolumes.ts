/** @fileoverview Verifies persistent storage on the selected local Aspire engine. */
import {Effect, Result} from "effect";

import {Process} from "../platform/Process.ts";
import {getContainerAdapter} from "./adapters.ts";
import {WorktreeLaunchError, type WorktreeLease, type WorktreeVolumes, worktreeRecord} from "./worktreeLease.ts";
import type {WorktreeEngineBinding} from "./worktreePreflight.ts";

const label = "ro.arolariu.worktree.scope";

function ownsVolume(output: string, name: string, scope: string): boolean {
  if (output.length > 16_384) return false;
  let parsed: unknown;
  try {
    parsed = JSON.parse(output);
  } catch {
    return false;
  }
  if (!Array.isArray(parsed) || parsed.length !== 1) return false;
  const volume: unknown = parsed[0];
  return (
    worktreeRecord(volume)
    && volume["Name"] === name
    && volume["Driver"] === "local"
    && worktreeRecord(volume["Labels"])
    && volume["Labels"][label] === scope
    && (volume["Options"] === null || (worktreeRecord(volume["Options"]) && Object.keys(volume["Options"]).length === 0))
  );
}

/** Creates missing scope-owned volumes, never adopts another owner's storage and never deletes volumes. */
export function prepareWorktreeVolumes<R>(
  lease: Readonly<WorktreeLease>,
  observe: Effect.Effect<WorktreeEngineBinding | undefined, never, R>,
): Effect.Effect<WorktreeVolumes, WorktreeLaunchError, Process | R> {
  return Effect.gen(function* () {
    const unavailable = () => new WorktreeLaunchError({message: "Scoped storage could not be verified on the pinned engine."});
    if (lease.mode !== "aspire" || lease.phase !== "reserved" || !/^[a-f0-9]{32}$/u.test(lease.scopeId)) return yield* unavailable();
    const runner = yield* Process;
    const cli = getContainerAdapter(lease.engine).primaryCli;
    const command = (args: readonly string[]) =>
      Effect.gen(function* () {
        const binding = yield* observe;
        if (!binding || binding.engine !== lease.engine || binding.fingerprint !== lease.engineId) return yield* unavailable();
        const result = yield* Effect.result(
          runner.run(
            {command: cli, args},
            {cwd: lease.root, env: binding.environment, echo: false, output: "capture", timeout: "15 seconds"},
          ),
        );
        if (Result.isFailure(result)) return yield* unavailable();
        return result.success.stdout;
      });

    for (const name of Object.values(lease.volumes)) {
      if (!name.startsWith(`arolariu-wt-${lease.scopeId}-`) || !/^[a-z0-9.-]{1,100}$/u.test(name)) return yield* unavailable();
      const listing = yield* command(["volume", "ls", "--filter", `name=${name}`, "--format", "{{.Name}}"]);
      const names = listing.trim().split(/\r?\n/u);
      if (!names.includes(name)) {
        const created = yield* command(["volume", "create", "--label", `${label}=${lease.scopeId}`, name]);
        if (created.trim() !== name) return yield* unavailable();
      }
      const volume = yield* command(["volume", "inspect", name]);
      if (!ownsVolume(volume, name, lease.scopeId)) return yield* unavailable();
      if ((yield* command(["ps", "--filter", `volume=${name}`, "--format", "{{.ID}}"])).trim() !== "") return yield* unavailable();
    }

    return lease.volumes;
  });
}
