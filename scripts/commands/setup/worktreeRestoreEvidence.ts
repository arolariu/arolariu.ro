/**
 * @fileoverview Atomic restore receipt publication inside the existing Setup action.
 * @module scripts/commands/setup/worktreeRestoreEvidence
 */
import {Effect, Exit, FileSystem, type Path, type PlatformError} from "effect";

import type {RepositoryPaths} from "../../common/repository-paths.ts";
import {inspectSolution} from "../../inspection/dotnet.ts";
import {inspectPath} from "../../inspection/files.ts";
import {
  renderWorktreeRestoreEvidence,
  restorePathsFor,
  snapshotWorktreeRestoreInputs,
  worktreeRestorePaths,
} from "../../inspection/worktreeRestore.ts";
import type {Environment} from "../../platform/Environment.ts";
import {ReadOnlyFiles, writeTextAtomic} from "../../platform/Files.ts";
import type {Process} from "../../platform/Process.ts";

/**
 * Wraps a forced solution restore inside its existing approved Setup action. A failed refresh
 * cannot authorize an old receipt; no raw inputs or generated graph are copied into evidence.
 *
 * @param paths - Canonical repository paths.
 * @param restore - Existing force-restore mutation controlled by Setup approval.
 * @param verify - The existing action's refreshed postcondition.
 * @returns Whether the restore published matching evidence, or a distinct finalization failure.
 */
export function recordWorktreeRestoreEvidence<A, E, R>(
  paths: RepositoryPaths,
  restore: Effect.Effect<A, E, R>,
  verify: Effect.Effect<boolean, never, ReadOnlyFiles> = Effect.succeed(true),
): Effect.Effect<
  boolean | "finalization-failed",
  E | PlatformError.PlatformError,
  R | ReadOnlyFiles | Environment | Process | FileSystem.FileSystem | Path.Path
> {
  return Effect.uninterruptibleMask((interruptible) =>
    Effect.gen(function* () {
      const before = yield* interruptible(snapshotWorktreeRestoreInputs(paths));
      if (!before) return false;
      const files = yield* ReadOnlyFiles;
      const fs = yield* FileSystem.FileSystem;
      const {path: pathApi, key} = restorePathsFor(before.platform);
      const directory = pathApi.join(before.root, worktreeRestorePaths.directory);
      const owns = (path: string) => Effect.map(files.realPath(path), (observed) => key(observed) === key(path));
      // Never follow a redirected obj or write outside the checkout.
      if (!(yield* owns(pathApi.dirname(directory)))) return false;
      if ((yield* inspectPath(directory)).kind === "missing") yield* fs.makeDirectory(directory);
      if (!(yield* owns(directory))) return false;
      const lock = pathApi.join(directory, worktreeRestorePaths.lock);
      yield* fs.writeFileString(lock, "", {flag: "wx"});
      const path = pathApi.join(directory, worktreeRestorePaths.receipt);
      const outcome = yield* Effect.exit(
        interruptible(
          Effect.gen(function* () {
            yield* restore;
            if (!(yield* verify)) return false;
            const solution = yield* inspectSolution(paths);
            if (solution.issues.length > 0 || solution.restoreIssues.length > 0) return false;
            const after = yield* snapshotWorktreeRestoreInputs(paths);
            if (after?.digest !== before.digest || after.root !== before.root) return false;
            const receipt = yield* renderWorktreeRestoreEvidence(after);
            if (!receipt || !(yield* owns(directory))) return false;
            yield* writeTextAtomic(path, receipt, {mode: 0o600});
            return true;
          }),
        ),
      );
      // Keep the lock if invalidation fails. Publication alone is not a successful refresh.
      const finalized = yield* Effect.gen(function* () {
        if (!(yield* owns(directory))) return false;
        const invalidate = Effect.gen(function* () {
          if ((yield* inspectPath(path)).kind !== "missing") yield* fs.remove(path);
        });
        if (!Exit.isSuccess(outcome) || !outcome.value) yield* invalidate;
        const unlocked = yield* fs.remove(lock).pipe(
          Effect.as(true),
          Effect.orElseSucceed(() => false),
        );
        if (!unlocked) {
          // Do not leave freshly published evidence behind even if the abandoned lock
          // is later cleared. If this cleanup also fails, the lock still fences readers.
          if ((yield* inspectPath(lock)).kind === "file") yield* invalidate.pipe(Effect.ignore);
          return false;
        }
        return (yield* inspectPath(lock)).kind === "missing";
      }).pipe(Effect.orElseSucceed(() => false));
      if (!finalized && !Exit.hasInterrupts(outcome)) return "finalization-failed" as const;
      if (Exit.isFailure(outcome)) return yield* Effect.failCause(outcome.cause);
      return outcome.value;
    }),
  );
}
