/**
 * @fileoverview Tests for manifest-derived repository setup requirements.
 * @module scripts/common/requirements.test
 */

import {join} from "node:path";

import {Effect} from "effect";
import {describe, expect, it} from "vitest";

import {effectTest, makeTestLayer, repositoryFixtureRoot} from "../platform/testing.ts";
import {createRepositoryPaths} from "./repository-paths.ts";
import {loadRepositoryRequirements, parseVersion, satisfiesMinimum, type RequirementLoadResult} from "./requirements.ts";

interface PackageJsonFixture {
  readonly name?: string;
  readonly engines?: Readonly<Record<string, string>>;
  readonly dependencies?: Readonly<Record<string, string>>;
  readonly devDependencies?: Readonly<Record<string, string>>;
}

interface PackageLockFixture {
  readonly name: string;
  readonly version: string;
  readonly lockfileVersion: number;
  readonly packages: Readonly<{
    "": Readonly<{
      name: string;
      version: string;
      dependencies?: Readonly<Record<string, string>>;
      devDependencies?: Readonly<Record<string, string>>;
    }>;
  }>;
}

const paths = createRepositoryPaths(repositoryFixtureRoot);
const DOTNET_PROPS = join("sites", "api.arolariu.ro", "Directory.Build.props");
const PYPROJECT = join("sites", "exp.arolariu.ro", "pyproject.toml");

function packageJson(overrides: Readonly<PackageJsonFixture> = {}): string {
  const manifest: PackageJsonFixture = {
    name: "@arolariu/monorepo",
    engines: {node: ">=24", npm: ">=11"},
    devDependencies: {next: "16.3.0", react: "19.2.8"},
    ...overrides,
  };
  return JSON.stringify(manifest);
}

function packageLock(devDependencies: Readonly<Record<string, string>> = {next: "16.3.0", react: "19.2.8"}): string {
  const lock: PackageLockFixture = {
    name: "@arolariu/monorepo",
    version: "0.0.0",
    lockfileVersion: 3,
    packages: {
      "": {
        name: "@arolariu/monorepo",
        version: "0.0.0",
        devDependencies,
      },
    },
  };
  return JSON.stringify(lock);
}

/**
 * Builds the in-memory requirement sources: a valid fixture with `overrides` applied.
 *
 * @param overrides - Relative paths whose contents replace the valid fixture.
 * @returns The seeded files.
 */
function fixture(overrides: Readonly<Record<string, string>> = {}): Readonly<Record<string, string>> {
  return {
    ".nvmrc": "24\n",
    ".node-version": "24\n",
    "package.json": packageJson(),
    "package-lock.json": packageLock(),
    [DOTNET_PROPS]: "<Project><PropertyGroup><TargetFramework>net10.0</TargetFramework></PropertyGroup></Project>",
    [PYPROJECT]: '[project]\nrequires-python = ">=3.12"\n',
    ...overrides,
  };
}

/**
 * Registers one case that loads the requirements from a seeded fixture.
 *
 * @param name - The test name.
 * @param files - The seeded requirement sources.
 * @param assert - Assertions over the load result.
 */
function requirementsTest(name: string, files: Readonly<Record<string, string>>, assert: (result: RequirementLoadResult) => void): void {
  effectTest(
    name,
    () =>
      Effect.gen(function* () {
        // Act
        const result = yield* loadRepositoryRequirements(paths);

        // Assert
        assert(result);
      }),
    makeTestLayer({files}).layer,
  );
}

describe("loadRepositoryRequirements", () => {
  requirementsTest("loads matching runtime requirements and exact locked package versions", fixture(), (result) => {
    expect(result.status).toBe("valid");
    if (result.status === "valid") {
      expect(result.requirements).toMatchObject({
        node: {major: 24, minor: 0, patch: 0},
        npm: {major: 11, minor: 0, patch: 0},
        dotnet: {major: 10, minor: 0, patch: 0},
        python: {major: 3, minor: 12, patch: 0},
      });
      expect([...result.requirements.packages]).toEqual([
        ["next", {name: "next", version: "16.3.0"}],
        ["react", {name: "react", version: "19.2.8"}],
      ]);
    }
  });

  requirementsTest("rejects contradictory Node requirement sources", fixture({".node-version": "22\n"}), (result) => {
    expect(result).toEqual({
      status: "invalid",
      errors: expect.arrayContaining([expect.stringContaining(".node-version")]),
    });
  });

  requirementsTest(
    "rejects unsupported Node engine syntax instead of guessing",
    fixture({"package.json": packageJson({engines: {node: "^24", npm: ">=11"}})}),
    (result) => {
      expect(result).toEqual({
        status: "invalid",
        errors: expect.arrayContaining([expect.stringContaining("engines.node")]),
      });
    },
  );

  requirementsTest(
    "rejects an unsupported target framework",
    fixture({[DOTNET_PROPS]: "<Project><PropertyGroup><TargetFramework>net10</TargetFramework></PropertyGroup></Project>"}),
    (result) => {
      expect(result).toEqual({
        status: "invalid",
        errors: expect.arrayContaining([expect.stringContaining("TargetFramework")]),
      });
    },
  );

  requirementsTest(
    "rejects unsupported Python requirement syntax",
    fixture({[PYPROJECT]: '[project]\nrequires-python = "^3.12"\n'}),
    (result) => {
      expect(result).toEqual({
        status: "invalid",
        errors: expect.arrayContaining([expect.stringContaining("requires-python")]),
      });
    },
  );

  requirementsTest(
    "rejects package versions that disagree with the root lock entry",
    fixture({"package-lock.json": packageLock({next: "16.2.0", react: "19.2.8"})}),
    (result) => {
      expect(result).toEqual({
        status: "invalid",
        errors: expect.arrayContaining([expect.stringContaining("next")]),
      });
    },
  );

  requirementsTest(
    "rejects non-exact package versions",
    fixture({
      "package.json": packageJson({devDependencies: {next: "^16.3.0", react: "19.2.8"}}),
      "package-lock.json": packageLock({next: "^16.3.0", react: "19.2.8"}),
    }),
    (result) => {
      expect(result).toEqual({
        status: "invalid",
        errors: expect.arrayContaining([expect.stringContaining("exact version")]),
      });
    },
  );

  requirementsTest(
    "reports malformed JSON and missing requirement fields",
    fixture({"package.json": "{", [PYPROJECT]: "[project]\n"}),
    (result) => {
      expect(result).toEqual({
        status: "invalid",
        errors: expect.arrayContaining([expect.stringContaining("package.json"), expect.stringContaining("requires-python")]),
      });
    },
  );

  const withoutNvmrc = Object.fromEntries(Object.entries(fixture()).filter(([path]) => path !== ".nvmrc"));
  requirementsTest("reports an unreadable requirement source with its path", withoutNvmrc, (result) => {
    expect(result).toEqual({
      status: "invalid",
      errors: expect.arrayContaining([expect.stringMatching(/^Unable to read .*\.nvmrc: Failed to readText '.*\.nvmrc': /u)]),
    });
  });
});

describe("parseVersion", () => {
  it.each([
    ["24", {major: 24, minor: 0, patch: 0}],
    ["10.0", {major: 10, minor: 0, patch: 0}],
    ["v24.1.2", {major: 24, minor: 1, patch: 2}],
  ])("parses supported version %s", (value, expected) => {
    expect(parseVersion(value)).toEqual(expected);
  });

  it.each(["", "1.2.3.4", "version 24", "24.x"])("rejects unsupported version %s", (value) => {
    expect(parseVersion(value)).toBeNull();
  });
});

describe("satisfiesMinimum", () => {
  it("compares major, minor, and patch components in order", () => {
    expect(satisfiesMinimum({major: 24, minor: 1, patch: 0}, {major: 24, minor: 0, patch: 9})).toBe(true);
    expect(satisfiesMinimum({major: 23, minor: 99, patch: 99}, {major: 24, minor: 0, patch: 0})).toBe(false);
  });
});
