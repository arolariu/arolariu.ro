/**
 * @fileoverview Atomic restore receipt publication inside the existing Setup action.
 * @module scripts/commands/setup/worktreeRestoreEvidence
 */
import {win32} from "node:path";

import {Effect, FileSystem, type Path, type PlatformError} from "effect";

import type {RepositoryPaths} from "../../common/repository-paths.ts";
import {inspectSolution} from "../../inspection/dotnet.ts";
import {inspectPath} from "../../inspection/files.ts";
import {renderWorktreeRestoreEvidence, snapshotWorktreeRestoreInputs, worktreeRestorePaths} from "../../inspection/worktreeRestore.ts";
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
 * @returns Whether the successful restore published matching evidence.
 */
export function recordWorktreeRestoreEvidence<A, E, R>(
  paths: RepositoryPaths,
  restore: Effect.Effect<A, E, R>,
  verify: Effect.Effect<boolean, never, ReadOnlyFiles> = Effect.succeed(true),
): Effect.Effect<boolean, E | PlatformError.PlatformError, R | ReadOnlyFiles | Environment | Process | FileSystem.FileSystem | Path.Path> {
  return Effect.scoped(
    Effect.gen(function* () {
      const before = yield* snapshotWorktreeRestoreInputs(paths);
      if (!before) return false;
      const files = yield* ReadOnlyFiles;
      const fs = yield* FileSystem.FileSystem;
      const directory = win32.join(before.root, worktreeRestorePaths.directory);
      const owns = (path: string) =>
        Effect.map(files.realPath(path), (observed) => win32.normalize(observed).toLowerCase() === path.toLowerCase());
      // Never follow a redirected obj or write outside the checkout.
      if (!(yield* owns(win32.dirname(directory)))) return false;
      if ((yield* inspectPath(directory)).kind === "missing") yield* fs.makeDirectory(directory);
      if (!(yield* owns(directory))) return false;
      const lock = win32.join(directory, worktreeRestorePaths.lock);
      let unlock = false;
      yield* Effect.acquireRelease(fs.writeFileString(lock, "", {flag: "wx"}), () =>
        Effect.gen(function* () {
          if (unlock && (yield* owns(directory))) yield* fs.remove(lock);
        }).pipe(Effect.ignore),
      );
      const path = win32.join(directory, worktreeRestorePaths.receipt);
      return yield* Effect.gen(function* () {
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
      }).pipe(
        Effect.onExit((exit) =>
          Effect.gen(function* () {
            if (exit._tag === "Success" && exit.value) {
              unlock = true;
              return;
            }
            if (!(yield* owns(directory))) return;
            if ((yield* inspectPath(path)).kind !== "missing") yield* fs.remove(path);
            unlock = true;
          }).pipe(Effect.ignore),
        ),
      );
    }),
  );
}
