/**
 * @fileoverview Tests for local container runtime selection.
 * @module scripts/container-runtime/selection.test
 */

import {describe, expect, it} from "vitest";
import {createMemoryFileSystem} from "../common/runtime.testing.ts";
import type {ReadOnlyFileSystem} from "../common/runtime.ts";
import {resolveContainerEngine, resolveRuntimeContainerEngine} from "./selection.ts";
import type {ContainerEngine} from "./types.ts";

const toolingConfigPath = "/virtual/tooling.local.json";

function filesWith(contents: string): ReadOnlyFileSystem {
  return createMemoryFileSystem({[toolingConfigPath]: contents});
}

function malformedToolingConfig(): ReadOnlyFileSystem {
  return filesWith("{ not valid json");
}

describe("resolveContainerEngine", () => {
  it("uses the --engine argument when present", () => {
    const result = resolveContainerEngine({
      argv: ["node", "script.ts", "--engine", "podman"],
      env: {},
    });

    expect(result).toEqual({engine: "podman", source: "argument"});
  });

  it("uses AROLARIU_CONTAINER_ENGINE when no argument is present", () => {
    const result = resolveContainerEngine({
      argv: ["node", "script.ts"],
      env: {AROLARIU_CONTAINER_ENGINE: "rancher"},
    });

    expect(result).toEqual({engine: "rancher", source: "environment"});
  });

  it("uses the persisted engine after arguments and environment", () => {
    expect(
      resolveContainerEngine({
        argv: ["node", "script.ts"],
        env: {},
        configuredEngine: "podman",
      }),
    ).toEqual({engine: "podman", source: "configuration"});
  });

  it("prefers arguments and environment over the persisted engine", () => {
    expect(
      resolveContainerEngine({
        argv: ["node", "script.ts", "--engine", "rancher"],
        env: {AROLARIU_CONTAINER_ENGINE: "rancher"},
        configuredEngine: "podman",
      }),
    ).toEqual({engine: "rancher", source: "argument"});
    expect(
      resolveContainerEngine({
        argv: ["node", "script.ts"],
        env: {AROLARIU_CONTAINER_ENGINE: "rancher"},
        configuredEngine: "podman",
      }),
    ).toEqual({engine: "rancher", source: "environment"});
  });

  it.each(["docker", "docker-desktop", "colima"])("rejects configured engine %s", (configuredEngine) => {
    expect(() =>
      resolveContainerEngine({
        argv: ["node", "script.ts"],
        env: {},
        configuredEngine,
      }),
    ).toThrow(configuredEngine === "colima" ? "Unsupported container engine" : "Docker Desktop is deprecated");
  });

  it("rejects docker as an engine", () => {
    expect(() =>
      resolveContainerEngine({
        argv: ["node", "script.ts", "--engine", "docker"],
        env: {},
      }),
    ).toThrow("Docker Desktop is deprecated for this repository");
  });

  it("rejects missing engine selection with a clear message", () => {
    expect(() =>
      resolveContainerEngine({
        argv: ["node", "script.ts"],
        env: {},
      }),
    ).toThrow("Select a container engine with --engine rancher|podman");
  });

  it("rejects unknown engines", () => {
    expect(() =>
      resolveContainerEngine({
        argv: ["node", "script.ts", "--engine", "colima"],
        env: {},
      }),
    ).toThrow("Unsupported container engine 'colima'");
  });
});

describe("resolveRuntimeContainerEngine", () => {
  it("uses an explicit requestedEngine without consulting malformed persisted configuration", async () => {
    await expect(
      resolveRuntimeContainerEngine({requestedEngine: "podman", env: {}, toolingConfigPath}, malformedToolingConfig()),
    ).resolves.toEqual({engine: "podman", source: "argument"});
  });

  it("uses the environment without consulting malformed persisted configuration", async () => {
    await expect(
      resolveRuntimeContainerEngine({env: {AROLARIU_CONTAINER_ENGINE: "rancher"}, toolingConfigPath}, malformedToolingConfig()),
    ).resolves.toEqual({engine: "rancher", source: "environment"});
  });

  it("surfaces malformed persisted configuration when no higher-priority source exists", async () => {
    await expect(resolveRuntimeContainerEngine({env: {}, toolingConfigPath}, malformedToolingConfig())).rejects.toThrow(
      "Invalid local tooling configuration",
    );
  });

  it("rejects an invalid explicit requestedEngine instead of falling back to persisted configuration", async () => {
    await expect(
      resolveRuntimeContainerEngine({requestedEngine: "colima" as ContainerEngine, env: {}, toolingConfigPath}, malformedToolingConfig()),
    ).rejects.toThrow("Unsupported container engine 'colima'");
  });

  it("reads persisted configuration only through the explicitly supplied filesystem", async () => {
    const files = filesWith(JSON.stringify({schemaVersion: 1, containerEngine: "podman"}));

    await expect(resolveRuntimeContainerEngine({env: {}, toolingConfigPath}, files)).resolves.toEqual({
      engine: "podman",
      source: "configuration",
    });
  });

  it("requires an engine when the supplied filesystem holds no persisted configuration", async () => {
    await expect(resolveRuntimeContainerEngine({env: {}, toolingConfigPath}, createMemoryFileSystem())).rejects.toThrow(
      "Select a container engine with --engine rancher|podman",
    );
  });
});
