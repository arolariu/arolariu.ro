/** @fileoverview Explicit ESM prose preparation, independent of the site's generated CommonJS files. */
import {NodeRuntime, NodeServices} from "@effect/platform-node";
import {Effect, type FileSystem, type PlatformError} from "effect";
import {join, resolve} from "node:path";

import {syncProse} from "../../../scripts/commands/docs/prose.ts";

/**
 * Prepares authored documentation without invoking reference extractors or application builds.
 * @param repositoryRoot - Checkout containing the authored docs and Docusaurus site.
 * @returns Prose mirroring, including the existing exclusion of ignored working artifacts.
 */
export function prepareSiteDocs(repositoryRoot: string): Effect.Effect<void, PlatformError.PlatformError, FileSystem.FileSystem> {
  return syncProse(join(repositoryRoot, "docs"), join(repositoryRoot, "sites", "docs.arolariu.ro", "docs", "monorepo"));
}

if (import.meta.main) {
  NodeRuntime.runMain(
    prepareSiteDocs(resolve(import.meta.dirname, "../../..")).pipe(
      Effect.tap(() => Effect.logInfo("Authored documentation prepared; generated references are excluded from this preview.")),
      Effect.provide(NodeServices.layer),
    ),
  );
}
