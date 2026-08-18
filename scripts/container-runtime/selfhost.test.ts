/**
 * @fileoverview Tests for engine-aware selfhost orchestration.
 * @module scripts/container-runtime/selfhost.test
 */

import {afterEach, describe, expect, it, vi} from "vitest";
import {basename} from "node:path";
import {buildTaxonomyArtifactGenerationCommand} from "../generate.artifacts.ts";
import {getContainerAdapter} from "./adapters.ts";
import {bootstrapCosmos, buildSelfhostPlan, getRequiredSqlPassword, shouldGenerateTaxonomyArtifacts} from "./selfhost.ts";

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

  it("rejects a missing SQL password", () => {
    delete process.env["MSSQL_SA_PASSWORD"];

    expect(() => getRequiredSqlPassword()).toThrow("MSSQL_SA_PASSWORD environment variable is required");
  });
});

describe("shouldGenerateTaxonomyArtifacts", () => {
  it("generates artifacts only for selfhost start", () => {
    expect(shouldGenerateTaxonomyArtifacts("start")).toBe(true);
    expect(shouldGenerateTaxonomyArtifacts("stop")).toBe(false);
    expect(shouldGenerateTaxonomyArtifacts("logs")).toBe(false);
  });

  it("uses the current Node executable instead of a shell-resolved npm command", () => {
    const command = buildTaxonomyArtifactGenerationCommand();

    expect(command.command).toBe(process.execPath);
    expect(basename(command.args[0] ?? "")).toBe("generate.artifacts.ts");
  });
});

describe("bootstrapCosmos", () => {
  it("creates the primary database and the invoices, merchants, and analysisRuns containers", async () => {
    const originalFetch = globalThis.fetch;
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", {status: 200}));
    vi.stubGlobal("fetch", fetchMock);

    try {
      await bootstrapCosmos();

      expect(fetchMock).toHaveBeenCalledTimes(4);
      expect(fetchMock).toHaveBeenNthCalledWith(1, "http://localhost:8081/dbs", expect.objectContaining({method: "POST"}));
      expect(fetchMock).toHaveBeenNthCalledWith(2, "http://localhost:8081/dbs/primary/colls", expect.objectContaining({method: "POST"}));
      expect(fetchMock).toHaveBeenNthCalledWith(3, "http://localhost:8081/dbs/primary/colls", expect.objectContaining({method: "POST"}));
      expect(fetchMock).toHaveBeenNthCalledWith(4, "http://localhost:8081/dbs/primary/colls", expect.objectContaining({method: "POST"}));

      const analysisRunsCall = fetchMock.mock.calls[3];
      const analysisRunsBody = JSON.parse((analysisRunsCall?.[1] as {body: string}).body);
      expect(analysisRunsBody).toEqual({
        id: "analysisRuns",
        partitionKey: {paths: ["/bucket"], kind: "Hash"},
        defaultTtl: -1,
      });
    } finally {
      vi.stubGlobal("fetch", originalFetch);
    }
  });

  it("wraps a failed bootstrap call in a ContainerRuntimeError", async () => {
    const originalFetch = globalThis.fetch;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("boom", {status: 500})));

    try {
      await expect(bootstrapCosmos()).rejects.toThrow(/Cosmos bootstrap failed/);
    } finally {
      vi.stubGlobal("fetch", originalFetch);
    }
  });
});
