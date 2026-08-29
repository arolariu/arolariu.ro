/**
 * @fileoverview Tests for manifest-derived repository setup requirements.
 * @module scripts/common/requirements.test
 */

import {mkdir, mkdtemp, rm, writeFile} from "node:fs/promises";
import {dirname, join} from "node:path";
import {fileURLToPath} from "node:url";
import {afterEach, beforeEach, describe, expect, it} from "vitest";
import {createRepositoryPaths, type RepositoryPaths} from "./repository-paths.ts";
import {loadRepositoryRequirements, parseVersion, satisfiesMinimum} from "./requirements.ts";

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

const testDirectory = dirname(fileURLToPath(import.meta.url));
let fixtureRoot: string;
let paths: RepositoryPaths;

async function writeFixture(relativePath: string, contents: string): Promise<void> {
  const destination = join(fixtureRoot, relativePath);
  await mkdir(dirname(destination), {recursive: true});
  await writeFile(destination, contents, "utf8");
}

async function writePackageJson(overrides: Readonly<PackageJsonFixture> = {}): Promise<void> {
  const packageJson: PackageJsonFixture = {
    name: "@arolariu/monorepo",
    engines: {node: ">=24", npm: ">=11"},
    devDependencies: {next: "16.3.0", react: "19.2.8"},
    ...overrides,
  };
  await writeFixture("package.json", JSON.stringify(packageJson));
}

async function writePackageLock(devDependencies: Readonly<Record<string, string>> = {next: "16.3.0", react: "19.2.8"}): Promise<void> {
  const packageLock: PackageLockFixture = {
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
  await writeFixture("package-lock.json", JSON.stringify(packageLock));
}

async function writeValidFixture(): Promise<void> {
  await Promise.all([
    writeFixture(".nvmrc", "24\n"),
    writeFixture(".node-version", "24\n"),
    writePackageJson(),
    writePackageLock(),
    writeFixture(
      join("sites", "api.arolariu.ro", "Directory.Build.props"),
      "<Project><PropertyGroup><TargetFramework>net10.0</TargetFramework></PropertyGroup></Project>",
    ),
    writeFixture(join("sites", "exp.arolariu.ro", "pyproject.toml"), '[project]\nrequires-python = ">=3.12"\n'),
  ]);
}

beforeEach(async () => {
  fixtureRoot = await mkdtemp(join(testDirectory, ".requirements-test-"));
  paths = createRepositoryPaths(fixtureRoot);
  await writeValidFixture();
});

afterEach(async () => {
  await rm(fixtureRoot, {recursive: true, force: true});
});

describe("loadRepositoryRequirements", () => {
  it("loads matching runtime requirements and exact locked package versions", async () => {
    const result = await loadRepositoryRequirements(paths);

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

  it("rejects contradictory Node requirement sources", async () => {
    await writeFixture(".node-version", "22\n");

    const result = await loadRepositoryRequirements(paths);

    expect(result).toEqual({
      status: "invalid",
      errors: expect.arrayContaining([expect.stringContaining(".node-version")]),
    });
  });

  it("rejects unsupported Node engine syntax instead of guessing", async () => {
    await writePackageJson({engines: {node: "^24", npm: ">=11"}});

    const result = await loadRepositoryRequirements(paths);

    expect(result).toEqual({
      status: "invalid",
      errors: expect.arrayContaining([expect.stringContaining("engines.node")]),
    });
  });

  it("rejects an unsupported target framework", async () => {
    await writeFixture(
      join("sites", "api.arolariu.ro", "Directory.Build.props"),
      "<Project><PropertyGroup><TargetFramework>net10</TargetFramework></PropertyGroup></Project>",
    );

    const result = await loadRepositoryRequirements(paths);

    expect(result).toEqual({
      status: "invalid",
      errors: expect.arrayContaining([expect.stringContaining("TargetFramework")]),
    });
  });

  it("rejects unsupported Python requirement syntax", async () => {
    await writeFixture(join("sites", "exp.arolariu.ro", "pyproject.toml"), '[project]\nrequires-python = "^3.12"\n');

    const result = await loadRepositoryRequirements(paths);

    expect(result).toEqual({
      status: "invalid",
      errors: expect.arrayContaining([expect.stringContaining("requires-python")]),
    });
  });

  it("rejects package versions that disagree with the root lock entry", async () => {
    await writePackageLock({next: "16.2.0", react: "19.2.8"});

    const result = await loadRepositoryRequirements(paths);

    expect(result).toEqual({
      status: "invalid",
      errors: expect.arrayContaining([expect.stringContaining("next")]),
    });
  });

  it("rejects non-exact package versions", async () => {
    await writePackageJson({devDependencies: {next: "^16.3.0", react: "19.2.8"}});
    await writePackageLock({next: "^16.3.0", react: "19.2.8"});

    const result = await loadRepositoryRequirements(paths);

    expect(result).toEqual({
      status: "invalid",
      errors: expect.arrayContaining([expect.stringContaining("exact version")]),
    });
  });

  it("reports malformed JSON and missing requirement fields", async () => {
    await writeFixture("package.json", "{");
    await writeFixture(join("sites", "exp.arolariu.ro", "pyproject.toml"), "[project]\n");

    const result = await loadRepositoryRequirements(paths);

    expect(result).toEqual({
      status: "invalid",
      errors: expect.arrayContaining([expect.stringContaining("package.json"), expect.stringContaining("requires-python")]),
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
