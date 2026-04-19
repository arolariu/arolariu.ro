import {describe, it, expect} from "vitest";
import type {ServiceSeries, HealthStatus} from "../types/status";
import {deriveLatestStatus, deriveOverallStatus} from "./deriveParentStatus";

function mkSeries(service: string, buckets: Array<{t: string; status: HealthStatus}>): ServiceSeries {
  return {
    service: service as ServiceSeries["service"],
    buckets: buckets.map(b => ({
      t: b.t, status: b.status,
      probes: {healthy: b.status === "Healthy" ? 1 : 0, total: 1},
      latency: {p50: 100, p99: 100},
    })),
  };
}

describe("deriveLatestStatus", () => {
  it("returns latest bucket status", () => {
    expect(deriveLatestStatus(mkSeries("arolariu.ro", [
      {t: "2026-04-19T13:00:00Z", status: "Healthy"},
      {t: "2026-04-19T14:00:00Z", status: "Degraded"},
    ]))).toBe("Degraded");
  });
  it("returns Healthy for empty buckets", () => {
    expect(deriveLatestStatus(mkSeries("arolariu.ro", []))).toBe("Healthy");
  });
});

describe("deriveOverallStatus", () => {
  it("returns worst across all services", () => {
    const s = [
      mkSeries("arolariu.ro", [{t: "2026-04-19T14:00:00Z", status: "Healthy"}]),
      mkSeries("api.arolariu.ro", [{t: "2026-04-19T14:00:00Z", status: "Degraded"}]),
    ];
    expect(deriveOverallStatus(s)).toBe("Degraded");
  });
  it("returns Healthy when all healthy", () => {
    const s = [mkSeries("arolariu.ro", [{t: "2026-04-19T14:00:00Z", status: "Healthy"}])];
    expect(deriveOverallStatus(s)).toBe("Healthy");
  });
});
