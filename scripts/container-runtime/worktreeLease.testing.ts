/** @fileoverview Synthetic lease registry fixture. */
import {Effect} from "effect";
import {mkdtemp, rm} from "node:fs/promises";
import {resolve} from "node:path";

import type {WorktreeLaunchPlatform} from "./worktreeLease.ts";
import type {WorktreeCheckout} from "./worktreePreflight.ts";

/** Uses only an exclusive temporary directory inside the ignored worktree artifacts. */
export async function leaseFixture(): Promise<{
  readonly directory: string;
  readonly checkout: WorktreeCheckout;
  readonly platform: WorktreeLaunchPlatform;
  readonly dispose: () => Promise<void>;
}> {
  const directory = await mkdtemp(resolve(".superpowers", "task-3-registry-"));
  const checkout = {root: resolve("."), commonGitDir: resolve("../.git"), branch: "chore/fixture", head: "1".repeat(40)};
  const platform: WorktreeLaunchPlatform = {
    registry: async () => directory,
    checkout: Effect.succeed(checkout),
    engine: Effect.succeed("a".repeat(64)),
    candidatePort: () => 0,
    processIdentity: async () => null,
  };
  return {directory, checkout, platform, dispose: () => rm(directory, {recursive: true})};
}
