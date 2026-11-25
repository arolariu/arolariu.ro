/** @fileoverview Synthetic lease registry fixture. */
import {Effect} from "effect";
import {mkdtemp, realpath, rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join, resolve} from "node:path";

import type {WorktreeLaunchPlatform} from "./worktreeLease.ts";
import type {WorktreeCheckout} from "./worktreePreflight.ts";

/** Uses only an exclusive temporary directory, independent of checkout artifacts. */
export async function leaseFixture(root = resolve(".")): Promise<{
  readonly directory: string;
  readonly checkout: WorktreeCheckout;
  readonly platform: WorktreeLaunchPlatform;
  readonly dispose: () => Promise<void>;
}> {
  const directory = await mkdtemp(join(await realpath(tmpdir()), "arolariu-task-3-registry-"));
  const checkout = {root, commonGitDir: resolve(root, "../.git"), branch: "chore/fixture", head: "1".repeat(40)};
  const platform: WorktreeLaunchPlatform = {
    registry: async () => directory,
    checkout: Effect.succeed(checkout),
    engine: Effect.succeed("a".repeat(64)),
    candidatePort: () => 0,
    processIdentity: async () => null,
  };
  return {directory, checkout, platform, dispose: () => rm(directory, {recursive: true})};
}
