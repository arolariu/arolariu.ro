import {describe, expect, it} from "vitest";
import type {ServiceSeries} from "../types/status";
import {computeWorstUptime} from "./worstUptime";

function svc(service: string, healthy: number, total: number): ServiceSeries {
  return {
    service: service as ServiceSeries["service"],
    buckets: [{t: "2026-04-20T00:00:00Z", status: "Healthy", probes: {healthy, total}, latency: {p50: 0, p99: 0}}],
  };
}

describe("computeWorstUptime", () => {
  it("returns service with lowest uptime", () => {
    const res = computeWorstUptime([svc("arolariu.ro", 100, 100), svc("exp.arolariu.ro", 87, 100)]);
    expect(res).toEqual({service: "exp.arolariu.ro", uptime: 87});
  });

  it("handles empty services gracefully", () => {
    expect(computeWorstUptime([])).toEqual({service: "", uptime: 100});
  });

  it("handles service with zero probes as 100%", () => {
    const res = computeWorstUptime([svc("cv.arolariu.ro", 0, 0), svc("arolariu.ro", 99, 100)]);
    expect(res).toEqual({service: "arolariu.ro", uptime: 99});
  });

  it("breaks ties by service name alphabetically", () => {
    const res = computeWorstUptime([svc("arolariu.ro", 95, 100), svc("api.arolariu.ro", 95, 100)]);
    expect(res.service).toBe("api.arolariu.ro");
  });

  it("keeps first-seen when later service has equal uptime but alphabetically larger name", () => {
    // api.arolariu.ro comes first (worst=api), then arolariu.ro has equal uptime
    // but "arolariu.ro" > "api.arolariu.ro" so tie-breaking is false → api stays worst
    const res = computeWorstUptime([svc("api.arolariu.ro", 95, 100), svc("arolariu.ro", 95, 100)]);
    expect(res.service).toBe("api.arolariu.ro");
  });
});
