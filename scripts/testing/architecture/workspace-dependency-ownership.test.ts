// @vitest-environment node

import {existsSync, readFileSync, readdirSync} from "node:fs";
import {join} from "node:path";
import {describe, expect, it} from "vitest";

import {
  collectDelegatedWorkspaceDependencyNames,
  collectKnipIgnoredDependencyNames,
  explicitlyRetainedRootDependencyNames,
  repositoryOwnedDependencyExclusionDefinitions,
  scriptsOwnedDelegatedDependencyNames,
  workspacePackageManifestPaths,
} from "./workspace-dependency-ownership.ts";

function discoverWorkspacePackageManifestPaths(): readonly string[] {
  return ["packages", "sites"]
    .flatMap((parent) =>
      readdirSync(parent, {withFileTypes: true})
        .filter((entry) => entry.isDirectory())
        .map((entry) => join(parent, entry.name, "package.json"))
        .filter(existsSync),
    )
    .map((path) => path.replaceAll("\\", "/"))
    .toSorted();
}

describe("workspace dependency ownership", () => {
  it("enumerates every npm workspace package manifest", () => {
    expect(workspacePackageManifestPaths).toEqual(discoverWorkspacePackageManifestPaths());
    expect(workspacePackageManifestPaths).toEqual([
      "packages/components/package.json",
      "sites/arolariu.ro/package.json",
      "sites/cv.arolariu.ro/package.json",
      "sites/docs.arolariu.ro/package.json",
      "sites/status.arolariu.ro/package.json",
    ]);
  });

  it("collects child-owned dependency names without hiding scripts-only dependencies", () => {
    const delegatedNames = collectDelegatedWorkspaceDependencyNames(process.cwd());
    const ignoredNames = collectKnipIgnoredDependencyNames(process.cwd());

    expect(delegatedNames).toContain("@clerk/nextjs");
    expect(delegatedNames).toContain("react");
    expect(delegatedNames).toContain("svelte");
    expect(delegatedNames).not.toContain("commander");
    expect(delegatedNames).toEqual([...new Set(delegatedNames)].toSorted());

    expect(scriptsOwnedDelegatedDependencyNames).toEqual([
      "@azure/identity",
      "@azure/storage-blob",
      "@types/node",
      "@vitest/coverage-v8",
      "typescript",
      "vitest",
    ]);
    for (const dependencyName of scriptsOwnedDelegatedDependencyNames) {
      expect(delegatedNames).toContain(dependencyName);
      expect(ignoredNames).not.toContain(dependencyName);
    }
    expect(ignoredNames).toEqual(
      [
        ...new Set([
          ...delegatedNames.filter(
            (dependencyName) => !scriptsOwnedDelegatedDependencyNames.some((ownedName) => ownedName === dependencyName),
          ),
          ...repositoryOwnedDependencyExclusionDefinitions.map(({dependencyName}) => dependencyName),
          ...explicitlyRetainedRootDependencyNames,
        ]),
      ].toSorted(),
    );
  });

  it("keeps the explicitly approved root dependency retention list exact", () => {
    expect(explicitlyRetainedRootDependencyNames).toEqual([
      "@microsoft/api-extractor",
      "@nx/workspace",
      "@storybook/addon-onboarding",
      "@storybook/addon-vitest",
      "@types/eslint",
      "eslint-plugin-react-compiler",
      "eslint-plugin-svelte",
      "svelte-eslint-parser",
    ]);
  });

  it("anchors every repository-owned dependency exclusion to live evidence", () => {
    expect(repositoryOwnedDependencyExclusionDefinitions).toEqual([
      {
        dependencyName: "@storybook/nextjs-vite",
        evidencePaths: ["sites/arolariu.ro/.storybook/main.ts"],
      },
      {
        dependencyName: "typedoc-plugin-markdown",
        evidencePaths: ["typedoc.components.json", "typedoc.website.json"],
      },
    ]);

    for (const {dependencyName, evidencePaths} of repositoryOwnedDependencyExclusionDefinitions) {
      for (const evidencePath of evidencePaths) {
        expect(readFileSync(evidencePath, "utf8")).toContain(dependencyName);
      }
    }
  });
});
