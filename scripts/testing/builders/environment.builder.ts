/**
 * @fileoverview Deterministic environment snapshot builder.
 * @module scripts/testing/builders/environment.builder
 */

import type {RuntimeEnvironment} from "../../core/runtime/runtime-capability.ts";
import {repositoryFixtureRoot} from "../fixtures/repository.fixture.ts";

/**
 * Builds the immutable environment snapshot every test runtime observes unless a case replaces one.
 *
 * @param overrides - Fields that replace the deterministic defaults.
 * @returns A complete environment snapshot.
 */
export function buildRuntimeEnvironment(overrides: Readonly<Partial<RuntimeEnvironment>> = {}): RuntimeEnvironment {
  return {
    variables: Object.freeze({}),
    cwd: repositoryFixtureRoot,
    executablePath: "/usr/bin/node",
    platform: "linux",
    architecture: "x64",
    stdinIsTTY: false,
    stdoutIsTTY: false,
    isCI: true,
    ...overrides,
  };
}
