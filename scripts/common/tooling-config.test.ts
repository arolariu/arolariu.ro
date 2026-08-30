// @vitest-environment node
/**
 * @fileoverview Tests for repository-local tooling configuration.
 * @module scripts/common/tooling-config.test
 */

import {mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {dirname, join} from "node:path";
import {afterEach, beforeEach, describe, expect, it} from "vitest";
import {mergeToolingConfig, parseToolingConfig, readToolingConfig, sha256File, writeToolingConfig} from "./tooling-config.ts";

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
    await expect(readToolingConfig(configPath)).resolves.toEqual({status: "missing"});
  });

  it("reads a valid version 1 document", async () => {
    await mkdir(dirname(configPath), {recursive: true});
    await writeFile(
      configPath,
      JSON.stringify({
        schemaVersion: 1,
        containerEngine: "podman",
        fingerprints: {
          nodeVersion: "24.0.0",
          rootPackageLockSha256: "abc123",
        },
      }),
      "utf8",
    );

    await expect(readToolingConfig(configPath)).resolves.toEqual({
      status: "valid",
      config: {
        schemaVersion: 1,
        containerEngine: "podman",
        fingerprints: {
          nodeVersion: "24.0.0",
          rootPackageLockSha256: "abc123",
        },
      },
    });
  });

  it("reports invalid JSON explicitly", async () => {
    await mkdir(dirname(configPath), {recursive: true});
    await writeFile(configPath, "{not json", "utf8");

    const result = await readToolingConfig(configPath);

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
});

describe("writeToolingConfig", () => {
  it("writes through a temporary sibling and atomically renames it", async () => {
    await writeToolingConfig(configPath, {
      schemaVersion: 1,
      containerEngine: "rancher",
    });

    await expect(readFile(configPath, "utf8")).resolves.toContain('"schemaVersion": 1');
    await expect(readdir(dirname(configPath))).resolves.toEqual(["tooling.local.json"]);
  });

  it("writes permission-conscious files where POSIX modes are supported", async () => {
    await writeToolingConfig(configPath, {
      schemaVersion: 1,
      containerEngine: "podman",
    });

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
    await writeToolingConfig(configPath, parsed);

    await expect(readFile(configPath, "utf8")).resolves.not.toContain("unexpected");
  });

  it("removes only its temporary sibling after rename failure", async () => {
    await mkdir(configPath, {recursive: true});
    await writeFile(join(configPath, "preserved.txt"), "keep", "utf8");

    await expect(
      writeToolingConfig(configPath, {
        schemaVersion: 1,
        containerEngine: "rancher",
      }),
    ).rejects.toThrow();

    await expect(readdir(dirname(configPath))).resolves.toEqual(["tooling.local.json"]);
    await expect(readFile(join(configPath, "preserved.txt"), "utf8")).resolves.toBe("keep");
  });
});

describe("sha256File", () => {
  it("returns the lowercase SHA-256 digest", async () => {
    const filePath = join(dirname(configPath), "fingerprint.txt");
    await mkdir(dirname(filePath), {recursive: true});
    await writeFile(filePath, "abc", "utf8");

    await expect(sha256File(filePath)).resolves.toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
});

describe("mergeToolingConfig", () => {
  it("creates version 1 configuration from a patch", () => {
    expect(mergeToolingConfig(undefined, {containerEngine: "podman"})).toEqual({
      schemaVersion: 1,
      containerEngine: "podman",
    });
  });

  it("preserves existing values and merges fingerprint fields", () => {
    expect(
      mergeToolingConfig(
        {
          schemaVersion: 1,
          containerEngine: "rancher",
          fingerprints: {
            nodeVersion: "24.0.0",
            rootPackageLockSha256: "old-root",
          },
        },
        {
          fingerprints: {
            rootPackageLockSha256: "new-root",
            pythonRequirementsSha256: "python",
          },
        },
      ),
    ).toEqual({
      schemaVersion: 1,
      containerEngine: "rancher",
      fingerprints: {
        nodeVersion: "24.0.0",
        rootPackageLockSha256: "new-root",
        pythonRequirementsSha256: "python",
      },
    });
  });
});
