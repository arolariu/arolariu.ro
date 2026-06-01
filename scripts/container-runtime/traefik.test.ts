/**
 * @fileoverview Tests for generated Traefik local selfhost routes.
 * @module scripts/container-runtime/traefik.test
 */

import {mkdtemp, readFile, rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {describe, expect, it} from "vitest";
import {buildSelfhostTraefikConfig, removeSelfhostTraefikConfig, writeSelfhostTraefikConfig} from "./traefik.ts";

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

  it("writes and removes the generated config at the default path", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "container-runtime-traefik-"));
    const targetPath = join(tempRoot, "infra", "Local", "Management", "traefik", "dynamic", "selfhost-services.yml");

    try {
      await writeSelfhostTraefikConfig(targetPath);
      await expect(readFile(targetPath, "utf8")).resolves.toContain("website-localhost");

      await removeSelfhostTraefikConfig(targetPath);
      await expect(readFile(targetPath, "utf8")).rejects.toThrow();
    } finally {
      await rm(tempRoot, {recursive: true, force: true});
    }
  });
});
