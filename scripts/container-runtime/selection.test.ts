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
