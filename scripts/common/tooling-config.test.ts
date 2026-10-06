// @vitest-environment node
/**
 * @fileoverview Tests for repository-local tooling configuration.
 * @module scripts/common/tooling-config.test
 */

import {mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {dirname, join} from "node:path";
import {Effect} from "effect";
import {afterEach, beforeEach, describe, expect, it} from "vitest";

import {effectTest, makeTestLayer, repositoryFixtureRoot} from "../platform/testing.ts";
import {mergeToolingConfig, parseToolingConfig, readToolingConfig, writeToolingConfig} from "./tooling-config.ts";

const temporaryRoots: string[] = [];
const nodeLayer = makeTestLayer({fileSystem: "node"}).layer;
let configPath: string;

beforeEach(async () => {
  const root = await mkdtemp(join(tmpdir(), "arolariu-tooling-config-test-"));
  temporaryRoots.push(root);
  configPath = join(root, ".arolariu", "tooling.local.json");
});

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, {recursive: true, force: true})));
});

/**
 * Writes the configuration fixture to the real temporary configuration path.
 *
 * @param contents - File contents.
 * @returns An effect completing once the file exists.
 */
function seedConfig(contents: string): Effect.Effect<void> {
  return Effect.promise(async () => {
    await mkdir(dirname(configPath), {recursive: true});
    await writeFile(configPath, contents, "utf8");
  });
}

describe("readToolingConfig", () => {
  effectTest(
    "reports a missing file",
    () =>
      Effect.gen(function* () {
        // Act
        const result = yield* readToolingConfig(configPath);

        // Assert
        expect(result).toEqual({status: "missing"});
      }),
    nodeLayer,
  );

  effectTest(
    "reports a missing tooling config as missing",
    () =>
      Effect.gen(function* () {
        // Act
        const result = yield* readToolingConfig(join(repositoryFixtureRoot, ".arolariu", "tooling.local.json"));

        // Assert
        expect(result).toEqual({status: "missing"});
      }),
    makeTestLayer().layer,
  );

  effectTest(
    "reads a valid version 1 document",
    () =>
      Effect.gen(function* () {
        // Arrange
        yield* seedConfig(JSON.stringify({schemaVersion: 1, containerEngine: "podman"}));

        // Act
        const result = yield* readToolingConfig(configPath);

        // Assert
        expect(result).toEqual({
          status: "valid",
          config: {schemaVersion: 1, containerEngine: "podman"},
        });
      }),
    nodeLayer,
  );

  effectTest(
    "reports invalid JSON explicitly",
    () =>
      Effect.gen(function* () {
        // Arrange
        yield* seedConfig("{not json");

        // Act
        const result = yield* readToolingConfig(configPath);

        // Assert
        expect(result.status).toBe("invalid");
        if (result.status === "invalid") {
          expect(result.error).toContain("Invalid local tooling configuration");
          expect(result.error).toContain(configPath);
        }
      }),
    nodeLayer,
  );

  effectTest(
    "reports an unsupported schema with the legacy message",
    () =>
      Effect.gen(function* () {
        // Arrange
        yield* seedConfig(JSON.stringify({schemaVersion: 2}));

        // Act
        const result = yield* readToolingConfig(configPath);

        // Assert
        expect(result).toEqual({
          status: "invalid",
          error: `Invalid local tooling configuration '${configPath}': Unsupported tooling configuration schema version '2'. Expected version 1.`,
        });
      }),
    nodeLayer,
  );

  effectTest(
    "reports an unreadable configuration explicitly",
    () =>
      Effect.gen(function* () {
        // Arrange
        yield* Effect.promise(() => mkdir(configPath, {recursive: true}));

        // Act
        const result = yield* readToolingConfig(configPath);

        // Assert
        expect(result.status).toBe("invalid");
        if (result.status === "invalid") {
          expect(result.error).toContain(
            `Unable to read local tooling configuration '${configPath}': Failed to readText '${configPath}': `,
          );
        }
      }),
    nodeLayer,
  );
});

describe("parseToolingConfig", () => {
  it("rejects unknown schema versions", () => {
    expect(() => parseToolingConfig({schemaVersion: 2})).toThrow("Unsupported tooling configuration schema version");
  });

  it("rejects an unknown container engine", () => {
    const containerEngine = "colima";
    expect(() => parseToolingConfig({schemaVersion: 1, containerEngine})).toThrow("Unsupported container engine");
  });

  it.each(["token", "secret", "password", "connectionString"])("rejects a secret-shaped property named %s", (key) => {
    const untrusted: unknown = {
      schemaVersion: 1,
      [key]: "value",
    };

    expect(() => parseToolingConfig(untrusted)).toThrow("must not contain secrets");
  });

  it("rejects nested secret-shaped properties", () => {
    expect(() =>
      parseToolingConfig({
        schemaVersion: 1,
        fingerprints: {
          nodeVersion: "24.0.0",
          api_token: "forbidden",
        },
      }),
    ).toThrow("must not contain secrets");
  });

  it("discards a legacy non-secret fingerprints object entirely while retaining the engine", () => {
    expect(
      parseToolingConfig({
        schemaVersion: 1,
        containerEngine: "podman",
        fingerprints: {
          nodeVersion: "24.0.0",
          pythonRequirementsSha256: "requirements-hash",
        },
      }),
    ).toEqual({
      schemaVersion: 1,
      containerEngine: "podman",
    });
  });

  it("still rejects a secret-shaped key nested inside an otherwise-discarded legacy object", () => {
    expect(() =>
      parseToolingConfig({
        schemaVersion: 1,
        fingerprints: {
          pythonRequirementsSha256: "requirements-hash",
        },
        legacySection: {
          nested: {
            apiSecret: "forbidden",
          },
        },
      }),
    ).toThrow("must not contain secrets");
  });
});

describe("writeToolingConfig", () => {
  effectTest(
    "writes through a temporary sibling and atomically renames it",
    () =>
      Effect.gen(function* () {
        // Act
        yield* writeToolingConfig(configPath, {schemaVersion: 1, containerEngine: "rancher"});

        // Assert
        const contents = yield* Effect.promise(() => readFile(configPath, "utf8"));
        expect(contents).toBe('{\n  "schemaVersion": 1,\n  "containerEngine": "rancher"\n}\n');
        expect(yield* Effect.promise(() => readdir(dirname(configPath)))).toEqual(["tooling.local.json"]);
      }),
    nodeLayer,
  );

  effectTest(
    "writes permission-conscious files where POSIX modes are supported",
    () =>
      Effect.gen(function* () {
        // Act
        yield* writeToolingConfig(configPath, {schemaVersion: 1, containerEngine: "podman"});

        // Assert
        if (process.platform !== "win32") {
          const metadata = yield* Effect.promise(() => stat(configPath));
          expect(metadata.mode & 0o777).toBe(0o600);
        }
      }),
    nodeLayer,
  );

  effectTest(
    "serializes only known schema properties",
    () =>
      Effect.gen(function* () {
        // Arrange
        const untrusted: unknown = {
          schemaVersion: 1,
          containerEngine: "rancher",
          unexpected: "discard me",
        };
        const parsed = parseToolingConfig(untrusted);

        // Act
        yield* writeToolingConfig(configPath, parsed);

        // Assert
        expect(yield* Effect.promise(() => readFile(configPath, "utf8"))).not.toContain("unexpected");
      }),
    nodeLayer,
  );

  effectTest(
    "removes only its temporary sibling after rename failure",
    () =>
      Effect.gen(function* () {
        // Arrange
        yield* Effect.promise(async () => {
          await mkdir(configPath, {recursive: true});
          await writeFile(join(configPath, "preserved.txt"), "keep", "utf8");
        });

        // Act
        const error = yield* Effect.flip(writeToolingConfig(configPath, {schemaVersion: 1, containerEngine: "rancher"}));

        // Assert
        expect(error._tag).toBe("PlatformError");
        expect(yield* Effect.promise(() => readdir(dirname(configPath)))).toEqual(["tooling.local.json"]);
        expect(yield* Effect.promise(() => readFile(join(configPath, "preserved.txt"), "utf8"))).toBe("keep");
      }),
    nodeLayer,
  );
});

describe("mergeToolingConfig", () => {
  it("creates version 1 configuration from a patch", () => {
    expect(mergeToolingConfig(undefined, {containerEngine: "podman"})).toEqual({
      schemaVersion: 1,
      containerEngine: "podman",
    });
  });

  it("preserves the existing container engine when the patch omits it", () => {
    expect(
      mergeToolingConfig(
        {
          schemaVersion: 1,
          containerEngine: "rancher",
        },
        {},
      ),
    ).toEqual({
      schemaVersion: 1,
      containerEngine: "rancher",
    });
  });

  it("overwrites the container engine with the patch value", () => {
    expect(
      mergeToolingConfig(
        {
          schemaVersion: 1,
          containerEngine: "rancher",
        },
        {
          containerEngine: "podman",
        },
      ),
    ).toEqual({
      schemaVersion: 1,
      containerEngine: "podman",
    });
  });
});
