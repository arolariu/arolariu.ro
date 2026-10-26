/**
 * @fileoverview Tests for repository-root discovery and canonical setup paths.
 * @module scripts/common/repository-paths.test
 */

import {join, resolve} from "node:path";
import {pathToFileURL} from "node:url";

import {Effect} from "effect";
import {describe, expect, it} from "vitest";

import {effectTest, makeTestLayer, repositoryFixtureRoot} from "../platform/testing.ts";
import {createRepositoryPaths, resolveRepositoryPaths} from "./repository-paths.ts";

const REPOSITORY_IDENTITY = JSON.stringify({name: "@arolariu/monorepo"});
const nestedModuleDirectory = join(repositoryFixtureRoot, "scripts", "nested");
const nestedModuleUrl = pathToFileURL(join(nestedModuleDirectory, "module.ts")).href;

describe("createRepositoryPaths", () => {
  it("builds canonical paths from the repository root", () => {
    const root = resolve("C:\\repo");
    const paths = createRepositoryPaths(root);

    expect(paths).toMatchObject({
      root,
      packageJson: resolve(root, "package.json"),
      packageLock: resolve(root, "package-lock.json"),
      githubScriptsRoot: resolve(root, ".github", "scripts"),
      githubScriptsPackageJson: resolve(root, ".github", "scripts", "package.json"),
      githubScriptsPackageLock: resolve(root, ".github", "scripts", "package-lock.json"),
      solution: resolve(root, "arolariu.slnx"),
      dotnetBuildProps: resolve(root, "sites", "api.arolariu.ro", "Directory.Build.props"),
      dotnetToolManifest: resolve(root, ".config", "dotnet-tools.json"),
      apiRoot: resolve(root, "sites", "api.arolariu.ro"),
      componentsRoot: resolve(root, "packages", "components"),
      websiteRoot: resolve(root, "sites", "arolariu.ro"),
      websiteEnvironment: resolve(root, "sites", "arolariu.ro", ".env"),
      cvRoot: resolve(root, "sites", "cv.arolariu.ro"),
      docsRoot: resolve(root, "sites", "docs.arolariu.ro"),
      statusRoot: resolve(root, "sites", "status.arolariu.ro"),
      expRoot: resolve(root, "sites", "exp.arolariu.ro"),
      pythonProject: resolve(root, "sites", "exp.arolariu.ro", "pyproject.toml"),
      pythonRequirements: resolve(root, "sites", "exp.arolariu.ro", "requirements-dev.txt"),
      toolingConfig: resolve(root, ".arolariu", "tooling.local.json"),
    });
  });
});

describe("resolveRepositoryPaths", () => {
  effectTest(
    "discovers a verified repository root from a nested module URL",
    () =>
      Effect.gen(function* () {
        // Act
        const paths = yield* resolveRepositoryPaths(nestedModuleUrl);

        // Assert
        expect(paths).toEqual(createRepositoryPaths(repositoryFixtureRoot));
      }),
    makeTestLayer({files: {"package.json": REPOSITORY_IDENTITY, "scripts/nested/module.ts": ""}}).layer,
  );

  effectTest(
    "does not mistake a nearer package for the repository root",
    () =>
      Effect.gen(function* () {
        // Act
        const paths = yield* resolveRepositoryPaths(nestedModuleUrl);

        // Assert
        expect(paths).toMatchObject({root: repositoryFixtureRoot});
      }),
    makeTestLayer({
      files: {
        "package.json": REPOSITORY_IDENTITY,
        "scripts/package.json": JSON.stringify({name: "@example/not-the-repository"}),
        "scripts/nested/module.ts": "",
      },
    }).layer,
  );

  effectTest(
    "fails with RepositoryRootNotFound outside a repository",
    () =>
      Effect.gen(function* () {
        // Act
        const error = yield* Effect.flip(resolveRepositoryPaths(nestedModuleUrl));

        // Assert
        expect(error).toMatchObject({
          _tag: "RepositoryRootNotFound",
          message: "Unable to locate repository root for @arolariu/monorepo",
          from: nestedModuleDirectory,
        });
      }),
    makeTestLayer({files: {"scripts/package.json": "{not json", "scripts/nested/module.ts": ""}}).layer,
  );
});
