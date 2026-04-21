// @vitest-environment node
import {describe, it, expect} from "vitest";
import type {ProbeResult} from "../src/lib/types/status";
import {serviceSignal} from "./detectIncidentsServices";

function mkProbe(partial: Partial<ProbeResult> & Pick<ProbeResult, "service" | "timestamp" | "overall">): ProbeResult {
  return {latencyMs: 100, httpStatus: partial.overall === "Healthy" ? 200 : 503, ...partial};
}

describe("serviceSignal", () => {
  it("uses probe.error when present", () => {
    const sig = serviceSignal(mkProbe({
      service: "arolariu.ro", timestamp: "2026-04-19T14:00:00Z",
      overall: "Unhealthy", error: "timeout",
    }));
    expect(sig.reason).toBe("timeout");
    expect(sig.key).toBe("arolariu.ro");
    expect(sig.status).toBe("Unhealthy");
  });

  it("falls back to first unhealthy sub-check description", () => {
    const sig = serviceSignal(mkProbe({
      service: "api.arolariu.ro", timestamp: "2026-04-19T14:00:00Z",
      overall: "Degraded",
      subChecks: [
        {name: "mssql", status: "Degraded", durationMs: 500, description: "slow"},
      ],
    }));
    expect(sig.reason).toBe("slow");
  });

  it("falls back to HTTP status when no error and no unhealthy sub-check", () => {
    const sig = serviceSignal(mkProbe({
      service: "arolariu.ro", timestamp: "2026-04-19T14:00:00Z",
      overall: "Unhealthy", httpStatus: 502,
    }));
    expect(sig.reason).toBe("HTTP 502");
  });
});
