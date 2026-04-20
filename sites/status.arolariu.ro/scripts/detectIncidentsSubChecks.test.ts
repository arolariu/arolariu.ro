// @vitest-environment node
import {describe, it, expect} from "vitest";
import type {ProbeResult} from "../src/lib/types/status";
import {subCheckSignals} from "./detectIncidentsSubChecks";

describe("subCheckSignals", () => {
  it("returns [] when no subChecks on the probe", () => {
    const sigs = subCheckSignals({
      service: "arolariu.ro", timestamp: "2026-04-19T14:00:00Z",
      latencyMs: 100, httpStatus: 200, overall: "Healthy",
    });
    expect(sigs).toHaveLength(0);
  });

  it("produces one signal per sub-check with namespaced track key", () => {
    const sigs = subCheckSignals({
      service: "api.arolariu.ro", timestamp: "2026-04-19T14:00:00Z",
      latencyMs: 100, httpStatus: 200, overall: "Degraded",
      subChecks: [
        {name: "mssql", status: "Degraded", durationMs: 500, description: "slow"},
        {name: "cosmosdb", status: "Healthy", durationMs: 40},
      ],
    });
    expect(sigs).toHaveLength(2);
    expect(sigs[0].key).toBe("api.arolariu.ro::mssql");
    expect(sigs[0].reason).toBe("slow");
    expect(sigs[1].key).toBe("api.arolariu.ro::cosmosdb");
    // Fallback reason when no description: "<name> <status>".
    expect(sigs[1].reason).toBe("cosmosdb Healthy");
  });
});
