/**
 * @fileoverview Tests for generated Traefik local selfhost routes.
 * @module scripts/container-runtime/traefik.test
 */

import {describe, expect, it} from "vitest";
import {createMemoryFileSystem} from "../testing/fixtures/memory-filesystem.fixture.ts";
import {buildSelfhostTraefikConfig, removeSelfhostTraefikConfig, selfhostTraefikConfigPath, writeSelfhostTraefikConfig} from "./traefik.ts";

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
});

describe("writeSelfhostTraefikConfig", () => {
  it("writes the supplied config at the fixed path through the injected filesystem, creating missing parents", async () => {
    const files = createMemoryFileSystem();

    await writeSelfhostTraefikConfig(files, buildSelfhostTraefikConfig());

    await expect(files.readText(selfhostTraefikConfigPath)).resolves.toContain("website-localhost");
  });

  it("writes exactly the supplied content instead of rebuilding it", async () => {
    const files = createMemoryFileSystem();

    await writeSelfhostTraefikConfig(files, "http:\n  routers: {}\n");

    await expect(files.readText(selfhostTraefikConfigPath)).resolves.toBe("http:\n  routers: {}\n");
  });

  it("replaces an existing generated config", async () => {
    const files = createMemoryFileSystem();

    await writeSelfhostTraefikConfig(files, "first");
    await writeSelfhostTraefikConfig(files, "second");

    await expect(files.readText(selfhostTraefikConfigPath)).resolves.toBe("second");
  });
});

describe("removeSelfhostTraefikConfig", () => {
  it("removes the generated config through the injected filesystem", async () => {
    const files = createMemoryFileSystem();
    await writeSelfhostTraefikConfig(files, buildSelfhostTraefikConfig());

    await removeSelfhostTraefikConfig(files);

    await expect(files.exists(selfhostTraefikConfigPath)).resolves.toBe(false);
  });

  it("succeeds when the generated config was never written", async () => {
    const files = createMemoryFileSystem();

    await expect(removeSelfhostTraefikConfig(files)).resolves.toBeUndefined();
  });
});
