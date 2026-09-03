/**
 * @fileoverview Authoritative ownership map between root, scripts-only, and workspace-owned dependencies.
 * @module scripts/testing/architecture/workspace-dependency-ownership
 *
 * @remarks
 * Knip evaluates the whole npm workspace, but `scripts/**` only ever imports a small, fixed set of
 * root-declared dependencies. Every other root dependency is either consumed exclusively by a child
 * `packages/*`/`sites/*` workspace package (delegated), retained by explicit plan-review decision, or
 * used by a repository tool outside Knip's configured scan scope (out-of-scope, with live evidence).
 * This module is the single source of truth both `knip.config.ts` and its architecture tests read, so
 * the Knip dependency-ignore list can never silently drift from what child manifests actually declare.
 */

import {readFileSync} from "node:fs";
import {resolve} from "node:path";

/** Every child npm workspace package manifest, forward-slash relative to the repository root. */
export const workspacePackageManifestPaths = [
  "packages/components/package.json",
  "sites/arolariu.ro/package.json",
  "sites/cv.arolariu.ro/package.json",
  "sites/docs.arolariu.ro/package.json",
  "sites/status.arolariu.ro/package.json",
] as const;

/** Root-declared dependency names that `scripts/**` imports directly and Knip must still evaluate. */
export const scriptsOwnedDelegatedDependencyNames = [
  "@azure/identity",
  "@azure/storage-blob",
  "@types/node",
  "@vitest/coverage-v8",
  "typescript",
  "vitest",
] as const;

/** One root dependency used outside Knip's configured scan scope, anchored to live evidence. */
interface RepositoryOwnedDependencyExclusionDefinition {
  /** Root-declared dependency name excluded from the scripts-scoped Knip scan. */
  readonly dependencyName: string;
  /** Repository-relative paths whose live content proves this dependency is genuinely used. */
  readonly evidencePaths: readonly string[];
}

/** Root dependencies consumed by repository tooling outside `scripts/**`'s configured Knip scope. */
export const repositoryOwnedDependencyExclusionDefinitions = [
  {
    dependencyName: "@storybook/nextjs-vite",
    evidencePaths: ["sites/arolariu.ro/.storybook/main.ts"],
  },
  {
    dependencyName: "typedoc-plugin-markdown",
    evidencePaths: ["typedoc.components.json", "typedoc.website.json"],
  },
] as const satisfies readonly RepositoryOwnedDependencyExclusionDefinition[];

/** Root dependencies explicitly retained during plan review as one exact tested exception list. */
export const explicitlyRetainedRootDependencyNames = [
  "@microsoft/api-extractor",
  "@nx/workspace",
  "@storybook/addon-onboarding",
  "@storybook/addon-vitest",
  "@types/eslint",
  "eslint-plugin-react-compiler",
  "eslint-plugin-svelte",
  "svelte-eslint-parser",
] as const;

const dependencyFieldNames = [
  "dependencies",
  "devDependencies",
  "peerDependencies",
  "optionalDependencies",
] as const;

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function dependencyNames(document: unknown, manifestPath: string): readonly string[] {
  if (!isRecord(document)) {
    throw new Error(`Expected ${manifestPath} to contain one JSON object.`);
  }

  return dependencyFieldNames.flatMap((fieldName) => {
    const field = document[fieldName];
    if (field === undefined) {
      return [];
    }
    if (!isRecord(field) || Object.values(field).some((version) => typeof version !== "string")) {
      throw new Error(`Expected ${manifestPath}#${fieldName} to contain string versions.`);
    }
    return Object.keys(field);
  });
}

/**
 * Collects every dependency name declared by a child workspace package manifest.
 *
 * @param repositoryRoot - Absolute path used to resolve {@link workspacePackageManifestPaths}.
 * @returns Sorted, de-duplicated dependency names owned by child workspace packages.
 */
export function collectDelegatedWorkspaceDependencyNames(repositoryRoot: string): readonly string[] {
  const names = workspacePackageManifestPaths.flatMap((manifestPath) => {
    const document: unknown = JSON.parse(readFileSync(resolve(repositoryRoot, manifestPath), "utf8"));
    return dependencyNames(document, manifestPath);
  });

  return [...new Set(names)].toSorted();
}

/**
 * Collects every root dependency name Knip's scripts-scoped scan must ignore.
 *
 * @remarks
 * The result is the union of child-workspace-delegated names (minus the six scripts-owned
 * dependencies that must remain visible to Knip), the out-of-scope repository-owned exclusions,
 * and the explicitly retained root dependency names.
 *
 * @param repositoryRoot - Absolute path used to resolve child workspace package manifests.
 * @returns Sorted, de-duplicated dependency names Knip must ignore for the root workspace.
 */
export function collectKnipIgnoredDependencyNames(repositoryRoot: string): readonly string[] {
  return [...new Set([
    ...collectDelegatedWorkspaceDependencyNames(repositoryRoot).filter(
      (dependencyName) => !scriptsOwnedDelegatedDependencyNames.some((ownedName) => ownedName === dependencyName),
    ),
    ...repositoryOwnedDependencyExclusionDefinitions.map(({dependencyName}) => dependencyName),
    ...explicitlyRetainedRootDependencyNames,
  ])].toSorted();
}
