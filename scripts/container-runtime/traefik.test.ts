/**
 * @fileoverview Tests for generated Traefik local selfhost routes.
 * @module scripts/container-runtime/traefik.test
 *
 * @remarks
 * The builder is pure and tested directly; the write and remove effects run on the in-memory
 * harness filesystem.
 */

import {dirname} from "node:path";

import {Effect, FileSystem} from "effect";
import {describe, expect, it} from "vitest";

import {effectTest, makeTestLayer} from "../platform/testing.ts";
import {buildSelfhostTraefikConfig, removeSelfhostTraefikConfig, selfhostTraefikConfigPath, writeSelfhostTraefikConfig} from "./traefik.ts";

/**
 * Reads the generated config through the harness filesystem.
 *
 * @returns The config text, or `null` when it does not exist.
 */
function readConfig(): Effect.Effect<string | null, unknown, FileSystem.FileSystem> {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    return (yield* fs.exists(selfhostTraefikConfigPath)) ? yield* fs.readFileString(selfhostTraefikConfigPath) : null;
  });
}

describe("buildSelfhostTraefikConfig", () => {
  it("creates static routes without Docker provider labels", () => {
    const yaml = buildSelfhostTraefikConfig();

    expect(yaml).toContain("website-localhost:");
    expect(yaml).toContain("rule: Host(`website.localhost`)");
    expect(yaml).toContain("url: http://website:3000");
    expect(yaml).toContain("api-localhost:");
    expect(yaml).toContain("url: http://api:8080");
    expect(yaml).toContain("traefik-localhost:");
    expect(yaml).toContain("service: api@internal");
    expect(yaml).not.toContain("providers.docker");
    expect(yaml).not.toContain("/var/run/docker.sock");
  });

  it("stays pure: repeated builds produce identical content without any capability", () => {
    expect(buildSelfhostTraefikConfig()).toBe(buildSelfhostTraefikConfig());
  });

  it("keeps the selfhost config path under the Management Traefik dynamic directory", () => {
    expect(selfhostTraefikConfigPath.replaceAll("\\", "/")).toMatch(
      /\/infra\/Local\/Management\/traefik\/dynamic\/selfhost-services\.yml$/u,
    );
  });
});

describe("writeSelfhostTraefikConfig", () => {
  const fresh = makeTestLayer();
  effectTest(
    "writes the supplied config at the fixed path, creating missing parents",
    () =>
      Effect.gen(function* () {
        // Act
        yield* writeSelfhostTraefikConfig(buildSelfhostTraefikConfig());

        // Assert
        expect(yield* readConfig()).toBe(buildSelfhostTraefikConfig());
        expect([...fresh.files().keys()].every((path) => !path.endsWith(".tmp"))).toBe(true);
      }),
    fresh.layer,
  );

  effectTest(
    "writes exactly the supplied content instead of rebuilding it",
    () =>
      Effect.gen(function* () {
        yield* writeSelfhostTraefikConfig("http:\n  routers: {}\n");
        expect(yield* readConfig()).toBe("http:\n  routers: {}\n");
      }),
    makeTestLayer().layer,
  );

  effectTest(
    "replaces an existing generated config",
    () =>
      Effect.gen(function* () {
        yield* writeSelfhostTraefikConfig("second");
        expect(yield* readConfig()).toBe("second");
      }),
    makeTestLayer({files: {[selfhostTraefikConfigPath]: "first"}}).layer,
  );

  const custom = `${dirname(selfhostTraefikConfigPath)}/custom.yml`;
  effectTest(
    "writes to an explicit path",
    () =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        yield* writeSelfhostTraefikConfig("custom", custom);
        expect(yield* fs.readFileString(custom)).toBe("custom");
        expect(yield* readConfig()).toBeNull();
      }),
    makeTestLayer().layer,
  );
});

describe("removeSelfhostTraefikConfig", () => {
  effectTest(
    "removes the generated config",
    () =>
      Effect.gen(function* () {
        yield* removeSelfhostTraefikConfig();
        expect(yield* readConfig()).toBeNull();
      }),
    makeTestLayer({files: {[selfhostTraefikConfigPath]: "generated traefik config"}}).layer,
  );

  effectTest("succeeds when the generated config was never written", () => removeSelfhostTraefikConfig(), makeTestLayer().layer);
});
