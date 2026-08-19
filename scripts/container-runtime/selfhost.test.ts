/**
 * @fileoverview Tests for engine-aware selfhost orchestration.
 * @module scripts/container-runtime/selfhost.test
 */

import {afterEach, describe, expect, it} from "vitest";
import {getContainerAdapter} from "./adapters.ts";
import {buildSelfhostPlan, getRequiredSqlPassword, shouldGenerateTaxonomyArtifacts} from "./selfhost.ts";

const originalSqlPassword = process.env["MSSQL_SA_PASSWORD"];

afterEach(() => {
  if (originalSqlPassword === undefined) {
    delete process.env["MSSQL_SA_PASSWORD"];
  } else {
    process.env["MSSQL_SA_PASSWORD"] = originalSqlPassword;
  }
});

describe("buildSelfhostPlan", () => {
  it("builds a Rancher-only start plan", () => {
    const plan = buildSelfhostPlan({
      action: "start",
      adapter: getContainerAdapter("rancher"),
    });

    expect(plan.map((command) => command.command)).toEqual(["docker", "docker", "docker", "docker"]);
    expect(plan.map((command) => command.args.join(" "))).toEqual([
      "compose -f Management/docker-compose.yml up -d",
      "compose -f Storage/docker-compose.yml --profile selfhost up -d",
      "compose -f Backend/docker-compose.yml up -d",
      "compose -f Frontend/docker-compose.yml up -d",
    ]);
  });

  it("builds a Podman-only stop plan", () => {
    const plan = buildSelfhostPlan({
      action: "stop",
      adapter: getContainerAdapter("podman"),
    });

    expect(plan.map((command) => command.command)).toEqual(["podman", "podman", "podman", "podman"]);
    expect(plan.map((command) => command.args.join(" "))).toEqual([
      "compose -f Frontend/docker-compose.yml down",
      "compose -f Backend/docker-compose.yml down",
      "compose -f Storage/docker-compose.yml down",
      "compose -f Management/docker-compose.yml down",
    ]);
  });

  it("builds engine-owned logs commands", () => {
    const plan = buildSelfhostPlan({
      action: "logs",
      adapter: getContainerAdapter("podman"),
    });

    expect(plan.map((command) => [command.command, command.args.join(" ")])).toEqual([
      ["podman", "logs --tail 100 exp-arolariu-ro"],
      ["podman", "logs --tail 100 api-arolariu-ro"],
      ["podman", "logs --tail 100 website-arolariu-ro"],
    ]);
  });
});

describe("getRequiredSqlPassword", () => {
  it("reads the SQL password from the process environment", () => {
    process.env["MSSQL_SA_PASSWORD"] = "local-strong-password";

    expect(getRequiredSqlPassword()).toBe("local-strong-password");
  });

  describe("shouldGenerateTaxonomyArtifacts", () => {
    it("generates artifacts before selfhost start", () => {
      expect(shouldGenerateTaxonomyArtifacts("start")).toBe(true);
    });

    it.each(["stop", "logs"] as const)("does not generate artifacts for %s", (action) => {
      expect(shouldGenerateTaxonomyArtifacts(action)).toBe(false);
    });
  });

  it("rejects a missing SQL password", () => {
    delete process.env["MSSQL_SA_PASSWORD"];

    expect(() => getRequiredSqlPassword()).toThrow("MSSQL_SA_PASSWORD environment variable is required");
  });
});
