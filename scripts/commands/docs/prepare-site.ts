/** @fileoverview Prose-only preparation program owned by repository tooling. */
import type {Effect, FileSystem, PlatformError} from "effect";
import {join, resolve} from "node:path";

import {syncProse} from "./prose.ts";

/**
 * Prepares authored documentation without invoking reference extractors or application builds.
 * @param repositoryRoot - Checkout containing the authored docs and Docusaurus site.
 * @returns Prose mirroring, including the existing exclusion of ignored working artifacts.
 */
export function prepareSiteDocs(
  repositoryRoot: string = resolve(import.meta.dirname, "../../.."),
): Effect.Effect<void, PlatformError.PlatformError, FileSystem.FileSystem> {
  return syncProse(join(repositoryRoot, "docs"), join(repositoryRoot, "sites", "docs.arolariu.ro", "docs", "monorepo"));
}
