/**
 * @fileoverview Tests for local container runtime selection.
 * @module scripts/container-runtime/selection.test
 *
 * @remarks
 * {@link resolveContainerEngine} stays a pure resolver and is tested directly. The Effect
 * {@link resolveRuntimeContainerEngine} runs on the in-memory harness: the environment snapshot
 * carries `AROLARIU_CONTAINER_ENGINE`, and seeded harness files carry the persisted configuration.
 */

import {Effect} from "effect";
import {describe, expect, it} from "vitest";

import {effectTest, makeTestLayer} from "../platform/testing.ts";
import {resolveContainerEngine, resolveRuntimeContainerEngine} from "./selection.ts";
import {ContainerRuntimeError, type ContainerEngine} from "./types.ts";

const toolingConfigPath = "/virtual/tooling.local.json";
const malformedToolingConfig = {[toolingConfigPath]: "{ not valid json"};

/** Exact legacy message of a missing engine selection. */
const missingSelectionMessage =
  "Select a container engine with --engine rancher|podman, AROLARIU_CONTAINER_ENGINE=rancher|podman, or local tooling configuration.";
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
  effectTest(
    "uses an explicit requestedEngine without consulting malformed persisted configuration",
    () =>
      Effect.gen(function* () {
        // Act
        const selection = yield* resolveRuntimeContainerEngine({requestedEngine: "podman", toolingConfigPath});

        // Assert
        expect(selection).toEqual({engine: "podman", source: "argument"});
      }),
    makeTestLayer({files: malformedToolingConfig, environment: {variables: {AROLARIU_CONTAINER_ENGINE: "rancher"}}}).layer,
  );

  effectTest(
    "uses the environment without consulting malformed persisted configuration",
    () =>
      Effect.gen(function* () {
        // Act
        const selection = yield* resolveRuntimeContainerEngine({toolingConfigPath});

        // Assert
        expect(selection).toEqual({engine: "rancher", source: "environment"});
      }),
    makeTestLayer({files: malformedToolingConfig, environment: {variables: {AROLARIU_CONTAINER_ENGINE: "rancher"}}}).layer,
  );

  effectTest(
    "reports docker desktop deprecation",
    () =>
      Effect.gen(function* () {
        // Act
        const error = yield* Effect.flip(resolveRuntimeContainerEngine({toolingConfigPath}));

        // Assert
        expect(error).toBeInstanceOf(ContainerRuntimeError);
        expect(error.message).toBe("Docker Desktop is deprecated for this repository. Select --engine rancher or --engine podman.");
      }),
    makeTestLayer({environment: {variables: {AROLARIU_CONTAINER_ENGINE: "docker"}}}).layer,
  );

  effectTest(
    "ignores a blank environment value and falls back to persisted configuration",
    () =>
      Effect.gen(function* () {
        // Act
        const selection = yield* resolveRuntimeContainerEngine({toolingConfigPath});

        // Assert
        expect(selection).toEqual({engine: "rancher", source: "configuration"});
      }),
    makeTestLayer({
      files: {[toolingConfigPath]: JSON.stringify({schemaVersion: 1, containerEngine: "rancher"})},
      environment: {variables: {AROLARIU_CONTAINER_ENGINE: "  "}},
    }).layer,
  );

  effectTest(
    "surfaces malformed persisted configuration when no higher-priority source exists",
    () =>
      Effect.gen(function* () {
        // Act
        const error = yield* Effect.flip(resolveRuntimeContainerEngine({toolingConfigPath}));

        // Assert
        expect(error).toBeInstanceOf(ContainerRuntimeError);
        expect(error.message).toMatch(/^Invalid local tooling configuration '.*tooling\.local\.json': /u);
      }),
    makeTestLayer({files: malformedToolingConfig}).layer,
  );

  effectTest(
    "rejects an invalid explicit requestedEngine instead of falling back to persisted configuration",
    () =>
      Effect.gen(function* () {
        // Act
        const error = yield* Effect.flip(resolveRuntimeContainerEngine({requestedEngine: "colima" as ContainerEngine, toolingConfigPath}));

        // Assert
        expect(error.message).toBe("Unsupported container engine 'colima'. Supported engines: rancher, podman.");
      }),
    makeTestLayer({files: malformedToolingConfig}).layer,
  );

  effectTest(
    "reads persisted configuration through ReadOnlyFiles",
    () =>
      Effect.gen(function* () {
        // Act
        const selection = yield* resolveRuntimeContainerEngine({toolingConfigPath});

        // Assert
        expect(selection).toEqual({engine: "podman", source: "configuration"});
      }),
    makeTestLayer({files: {[toolingConfigPath]: JSON.stringify({schemaVersion: 1, containerEngine: "podman"})}}).layer,
  );

  effectTest(
    "requires an engine when no persisted configuration exists",
    () =>
      Effect.gen(function* () {
        // Act
        const error = yield* Effect.flip(resolveRuntimeContainerEngine({toolingConfigPath}));

        // Assert
        expect(error).toBeInstanceOf(ContainerRuntimeError);
        expect(error.message).toBe(missingSelectionMessage);
      }),
    makeTestLayer().layer,
  );

  effectTest(
    "requires an engine when the persisted configuration names none",
    () =>
      Effect.gen(function* () {
        // Act
        const error = yield* Effect.flip(resolveRuntimeContainerEngine({toolingConfigPath}));

        // Assert
        expect(error.message).toBe(missingSelectionMessage);
      }),
    makeTestLayer({files: {[toolingConfigPath]: JSON.stringify({schemaVersion: 1})}}).layer,
  );
});

describe("resolveContainerEngine error shape", () => {
  it("throws the tagged ContainerRuntimeError for a missing --engine value", () => {
    expect(() => resolveContainerEngine({argv: ["--engine"], env: {}})).toThrow(
      new ContainerRuntimeError({message: "Missing value for --engine. Use --engine rancher or --engine podman."}),
    );
  });

  it("reads an inline --engine= argument", () => {
    expect(resolveContainerEngine({argv: ["--engine=Podman"], env: {}})).toEqual({engine: "podman", source: "argument"});
  });
});
