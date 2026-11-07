/**
 * @fileoverview Authored documentation mirroring without reference-extractor dependencies.
 */
import {join} from "node:path";

import {Effect, FileSystem, type PlatformError} from "effect";

/**
 * Mirrors authored documentation while excluding ignored agent working artifacts.
 * @param src - Authored documentation directory.
 * @param dest - Documentation-site prose destination.
 * @returns The existing replacement/copy/exclusion sequence.
 */
export const syncProse: (src: string, dest: string) => Effect.Effect<void, PlatformError.PlatformError, FileSystem.FileSystem> = Effect.fn(
  "docs.syncProse",
)(function* (src: string, dest: string) {
  const fs = yield* FileSystem.FileSystem;
  yield* fs.remove(dest, {recursive: true, force: true});
  yield* fs.makeDirectory(dest, {recursive: true});
  yield* fs.copy(src, dest, {overwrite: true});
  yield* fs.remove(join(dest, "superpowers"), {recursive: true, force: true});
});
