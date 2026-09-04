/**
 * @fileoverview Repository-anchored in-memory filesystem fixture.
 * @module scripts/testing/fixtures/repository.fixture
 *
 * @remarks
 * The only Node modules used here are `node:path` and `node:url`, and only to derive
 * {@link repositoryFixtureRoot} from this module's own location.
 */

import {dirname, resolve} from "node:path";
import {fileURLToPath} from "node:url";

import type {FileSystem} from "../../core/runtime/runtime-capability.ts";
import {createMemoryFileSystem} from "./memory-filesystem.fixture.ts";

/** Repository root every fixture filesystem is anchored to. */
export const repositoryFixtureRoot: string = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

/**
 * Creates an in-memory filesystem that already identifies {@link repositoryFixtureRoot} as the
 * monorepository root, so `resolveRepositoryPaths(import.meta.url, files)` resolves without real
 * I/O.
 *
 * @param initialFiles - Files overlaid on top of the seeded repository identity.
 * @returns A filesystem capability anchored to the fixture repository root.
 */
export function createRepositoryFixtureFileSystem(initialFiles: Readonly<Record<string, string | Uint8Array>> = {}): FileSystem {
  return createMemoryFileSystem({
    [`${repositoryFixtureRoot}/package.json`]: JSON.stringify({name: "@arolariu/monorepo"}, null, 2),
    ...initialFiles,
  });
}
