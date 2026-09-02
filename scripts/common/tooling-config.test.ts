// @vitest-environment node
/**
 * @fileoverview Tests for repository-local tooling configuration.
 * @module scripts/common/tooling-config.test
 */

import {mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {dirname, join} from "node:path";
import {afterEach, beforeEach, describe, expect, it} from "vitest";
import {nodeFileSystem} from "./runtime.node.ts";
import {mergeToolingConfig, parseToolingConfig, readToolingConfig, writeToolingConfig} from "./tooling-config.ts";

const temporaryRoots: string[] = [];
let configPath: string;

beforeEach(async () => {
  const root = await mkdtemp(join(tmpdir(), "arolariu-tooling-config-test-"));
  temporaryRoots.push(root);
  configPath = join(root, ".arolariu", "tooling.local.json");
});

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, {recursive: true, force: true})));
});

describe("readToolingConfig", () => {
  it("reports a missing file", async () => {
    await expect(readToolingConfig(configPath, nodeFileSystem)).resolves.toEqual({status: "missing"});
  });

  it("reads a valid version 1 document", async () => {
    await mkdir(dirname(configPath), {recursive: true});
    await writeFile(configPath, JSON.stringify({schemaVersion: 1, containerEngine: "podman"}), "utf8");

    await expect(readToolingConfig(configPath, nodeFileSystem)).resolves.toEqual({
      status: "valid",
      config: {schemaVersion: 1, containerEngine: "podman"},
    });
  });

  it("reports invalid JSON explicitly", async () => {
    await mkdir(dirname(configPath), {recursive: true});
    await writeFile(configPath, "{not json", "utf8");

    const result = await readToolingConfig(configPath, nodeFileSystem);

    expect(result.status).toBe("invalid");
    if (result.status === "invalid") {
      expect(result.error).toContain("Invalid local tooling configuration");
      expect(result.error).toContain(configPath);
    }
  });
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
  it("writes through a temporary sibling and atomically renames it", async () => {
    await writeToolingConfig(
      configPath,
      {
        schemaVersion: 1,
        containerEngine: "rancher",
      },
      nodeFileSystem,
    );

    await expect(readFile(configPath, "utf8")).resolves.toContain('"schemaVersion": 1');
    await expect(readdir(dirname(configPath))).resolves.toEqual(["tooling.local.json"]);
  });

  it("writes permission-conscious files where POSIX modes are supported", async () => {
    await writeToolingConfig(
      configPath,
      {
        schemaVersion: 1,
        containerEngine: "podman",
      },
      nodeFileSystem,
    );

    if (process.platform !== "win32") {
      const metadata = await stat(configPath);
      expect(metadata.mode & 0o777).toBe(0o600);
    }
  });

  it("serializes only known schema properties", async () => {
    const untrusted: unknown = {
      schemaVersion: 1,
      containerEngine: "rancher",
      unexpected: "discard me",
    };

    const parsed = parseToolingConfig(untrusted);
    await writeToolingConfig(configPath, parsed, nodeFileSystem);

    await expect(readFile(configPath, "utf8")).resolves.not.toContain("unexpected");
  });

  it("removes only its temporary sibling after rename failure", async () => {
    await mkdir(configPath, {recursive: true});
    await writeFile(join(configPath, "preserved.txt"), "keep", "utf8");

    await expect(
      writeToolingConfig(
        configPath,
        {
          schemaVersion: 1,
          containerEngine: "rancher",
        },
        nodeFileSystem,
      ),
    ).rejects.toThrow();

    await expect(readdir(dirname(configPath))).resolves.toEqual(["tooling.local.json"]);
    await expect(readFile(join(configPath, "preserved.txt"), "utf8")).resolves.toBe("keep");
  });
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
