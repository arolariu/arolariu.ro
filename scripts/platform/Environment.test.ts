// @vitest-environment node
/**
 * @fileoverview Tests for the Effect `Environment` service and its layers.
 * @module scripts/platform/Environment.test
 *
 * @remarks
 * Verifies that {@link layerEnvironment} exposes a given snapshot unchanged and that
 * {@link EnvironmentLive} snapshots the ambient process with legacy CI detection and a frozen
 * variables object. Environment variables are stubbed through Vitest and restored after each case.
 */

import {Effect} from "effect";
import {afterEach, describe, expect, it, vi} from "vitest";

import {Environment, EnvironmentLive, layerEnvironment, type EnvironmentSnapshot} from "./Environment.ts";
import {effectTest, runScoped} from "./testing.ts";

const snapshot: EnvironmentSnapshot = {
  variables: {HOME: "/home/test"},
  cwd: "/repo",
  executablePath: "/usr/bin/node",
  platform: "linux",
  architecture: "x64",
  stdinIsTTY: false,
  stdoutIsTTY: true,
  isCI: false,
};

describe("Environment", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  effectTest(
    "layerEnvironment exposes the given snapshot",
    () =>
      Effect.gen(function* () {
        // Act
        const environment = yield* Environment;

        // Assert
        expect(environment).toEqual(snapshot);
      }),
    layerEnvironment(snapshot),
  );

  it("EnvironmentLive marks CI from GITHUB_ACTIONS", async () => {
    // Arrange
    vi.stubEnv("CI", undefined);
    vi.stubEnv("GITHUB_ACTIONS", "true");

    // Act
    const environment = await runScoped(Effect.service(Environment), EnvironmentLive);

    // Assert
    expect(environment.isCI).toBe(true);
  });

  it("EnvironmentLive freezes variables", async () => {
    // Arrange
    const program = Effect.service(Environment);

    // Act
    const environment = await runScoped(program, EnvironmentLive);

    // Assert
    expect(Object.isFrozen(environment.variables)).toBe(true);
  });
});
