/**
 * @fileoverview Verified repository discovery and canonical monorepository paths.
 * @module scripts/common/repository-paths
 */

import {dirname, parse, resolve} from "node:path";
import {fileURLToPath} from "node:url";

import {Effect, Schema} from "effect";

import {ReadOnlyFiles} from "../platform/Files.ts";

const REPOSITORY_PACKAGE_NAME = "@arolariu/monorepo";

/** Canonical paths used by repository setup and diagnostic scripts. */
export interface RepositoryPaths {
  readonly root: string;
  readonly packageJson: string;
  readonly packageLock: string;
  readonly githubScriptsRoot: string;
  readonly githubScriptsPackageJson: string;
  readonly githubScriptsPackageLock: string;
  readonly solution: string;
  readonly dotnetBuildProps: string;
  readonly dotnetToolManifest: string;
  readonly apiRoot: string;
  readonly componentsRoot: string;
  readonly websiteRoot: string;
  readonly websiteEnvironment: string;
  readonly cvRoot: string;
  readonly docsRoot: string;
  readonly statusRoot: string;
  readonly expRoot: string;
  readonly pythonProject: string;
  readonly pythonRequirements: string;
  readonly toolingConfig: string;
}

/**
 * Constructs canonical repository paths from an already verified root.
 *
 * @param root - Repository root directory.
 * @returns Canonical paths for setup and diagnostic modules.
 */
export function createRepositoryPaths(root: string): RepositoryPaths {
  const resolvedRoot = resolve(root);
  const githubScriptsRoot = resolve(resolvedRoot, ".github", "scripts");
  const apiRoot = resolve(resolvedRoot, "sites", "api.arolariu.ro");
  const websiteRoot = resolve(resolvedRoot, "sites", "arolariu.ro");
  const expRoot = resolve(resolvedRoot, "sites", "exp.arolariu.ro");

  return {
    root: resolvedRoot,
    packageJson: resolve(resolvedRoot, "package.json"),
    packageLock: resolve(resolvedRoot, "package-lock.json"),
    githubScriptsRoot,
    githubScriptsPackageJson: resolve(githubScriptsRoot, "package.json"),
    githubScriptsPackageLock: resolve(githubScriptsRoot, "package-lock.json"),
    solution: resolve(resolvedRoot, "arolariu.slnx"),
    dotnetBuildProps: resolve(apiRoot, "Directory.Build.props"),
    dotnetToolManifest: resolve(resolvedRoot, ".config", "dotnet-tools.json"),
    apiRoot,
    componentsRoot: resolve(resolvedRoot, "packages", "components"),
    websiteRoot,
    websiteEnvironment: resolve(websiteRoot, ".env"),
    cvRoot: resolve(resolvedRoot, "sites", "cv.arolariu.ro"),
    docsRoot: resolve(resolvedRoot, "sites", "docs.arolariu.ro"),
    statusRoot: resolve(resolvedRoot, "sites", "status.arolariu.ro"),
    expRoot,
    pythonProject: resolve(expRoot, "pyproject.toml"),
    pythonRequirements: resolve(expRoot, "requirements-dev.txt"),
    toolingConfig: resolve(resolvedRoot, ".arolariu", "tooling.local.json"),
  };
}

/** No ancestor of a module identifies the arolariu.ro monorepository. */
export class RepositoryRootNotFound extends Schema.TaggedError<RepositoryRootNotFound>()("RepositoryRootNotFound", {
  message: Schema.String,
  from: Schema.String,
}) {}

/**
 * Checks whether `package.json` contents name the monorepository.
 *
 * @param contents - Raw `package.json` text.
 * @returns `true` for the monorepository identity; malformed JSON is `false`.
 */
function isRepositoryIdentity(contents: string): boolean {
  try {
    const packageJson: unknown = JSON.parse(contents);
    return typeof packageJson === "object" && packageJson !== null && "name" in packageJson && packageJson.name === REPOSITORY_PACKAGE_NAME;
  } catch {
    return false;
  }
}

/**
 * Checks whether a directory holds the monorepository `package.json` identity.
 *
 * @param directory - Candidate repository root.
 * @returns `true` when its `package.json` names the monorepository; any read or parse failure is `false`.
 */
function hasRepositoryIdentity(directory: string): Effect.Effect<boolean, never, ReadOnlyFiles> {
  return Effect.gen(function* () {
    const files = yield* ReadOnlyFiles;
    return yield* files.readFileString(resolve(directory, "package.json")).pipe(
      Effect.map(isRepositoryIdentity),
      Effect.orElseSucceed(() => false),
    );
  });
}

/**
 * Discovers the repository root from a module URL and verifies its package identity.
 *
 * @param moduleUrl - File URL belonging to a module within the repository.
 * @returns Canonical paths anchored to the verified repository root, read through
 * {@link ReadOnlyFiles}; fails with {@link RepositoryRootNotFound} when no ancestor package
 * identifies the arolariu.ro monorepository.
 */
export function resolveRepositoryPaths(moduleUrl: string): Effect.Effect<RepositoryPaths, RepositoryRootNotFound, ReadOnlyFiles> {
  return Effect.gen(function* () {
    const from = dirname(fileURLToPath(moduleUrl));
    const filesystemRoot = parse(from).root;
    let candidate = from;

    while (true) {
      if (yield* hasRepositoryIdentity(candidate)) {
        return createRepositoryPaths(candidate);
      }
      if (candidate === filesystemRoot) {
        break;
      }
      candidate = dirname(candidate);
    }

    return yield* new RepositoryRootNotFound({message: `Unable to locate repository root for ${REPOSITORY_PACKAGE_NAME}`, from});
  });
}
