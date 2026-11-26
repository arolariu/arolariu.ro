/** @fileoverview Generic registry route verification, independent of the store adapter. */
import {Effect} from "effect";
import {dirname, isAbsolute, normalize} from "node:path";

import {worktreeDirectory, worktreeIO} from "../platform/WorktreeHost.ts";

/** Gates store access on an unredirected canonical route. */
export function openWorktreeRegistryRoute<R>(
  parent: string,
  openStore: (parent: string) => Effect.Effect<string | null, unknown, R>,
): Effect.Effect<string | null, unknown, R> {
  return worktreeIO(async () => {
    if (!isAbsolute(parent) || normalize(parent) !== parent || dirname(parent) === parent) throw new Error("Invalid registry parent");
    for (let dir = parent; ; dir = dirname(dir)) {
      if (!(await worktreeDirectory(dir))) throw new Error("Missing registry ancestor");
      if (dirname(dir) === dir) break;
    }
  }).pipe(Effect.flatMap(() => openStore(parent)));
}
