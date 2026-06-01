/**
 * @fileoverview Tests for local container runtime selection.
 * @module scripts/container-runtime/selection.test
 */

import {describe, expect, it} from "vitest";
import {resolveContainerEngine} from "./selection.ts";

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
