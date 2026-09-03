/**
 * @fileoverview Tests for repository-root discovery and canonical setup paths.
 * @module scripts/common/repository-paths.test
 */

import {mkdir, mkdtemp, rm, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {dirname, join, resolve} from "node:path";
import {pathToFileURL} from "node:url";
import {afterEach, describe, expect, it} from "vitest";
import {createRepositoryPaths, resolveRepositoryPaths} from "./repository-paths.ts";
import {nodeFileSystem} from "./runtime.node.ts";

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, {recursive: true, force: true})));
});

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
  it("discovers a verified repository root from a nested module URL", async () => {
    const root = await mkdtemp(join(tmpdir(), "arolariu-repository-paths-test-"));
    temporaryRoots.push(root);
    const nestedModule = join(root, "scripts", "nested", "module.ts");

    await mkdir(dirname(nestedModule), {recursive: true});
    await writeFile(join(root, "package.json"), JSON.stringify({name: "@arolariu/monorepo"}), "utf8");
    await writeFile(nestedModule, "", "utf8");

    const paths = await resolveRepositoryPaths(pathToFileURL(nestedModule).href, nodeFileSystem);

    expect(paths).toEqual(createRepositoryPaths(root));
  });

  it("does not mistake a nearer package for the repository root", async () => {
    const root = await mkdtemp(join(tmpdir(), "arolariu-repository-paths-test-"));
    temporaryRoots.push(root);
    const nestedModule = join(root, "scripts", "nested", "module.ts");

    await mkdir(dirname(nestedModule), {recursive: true});
    await writeFile(join(root, "package.json"), JSON.stringify({name: "@arolariu/monorepo"}), "utf8");
    await writeFile(join(root, "scripts", "package.json"), JSON.stringify({name: "@example/not-the-repository"}), "utf8");
    await writeFile(nestedModule, "", "utf8");

    await expect(resolveRepositoryPaths(pathToFileURL(nestedModule).href, nodeFileSystem)).resolves.toMatchObject({root});
  });
});
