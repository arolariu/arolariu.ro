import {describe, it, expect} from "vitest";
import type {IncidentsFile, ServiceSeries} from "../types/status";
import {computeOverallUptime, computeAvgLatency, computeIncidentCount, computeMttr} from "./summaryStats";

function mkSeries(service: string, buckets: Array<{healthy: number; total: number; p50: number}>): ServiceSeries {
  return {
    service: service as ServiceSeries["service"],
    buckets: buckets.map((b, i) => ({
      t: new Date(Date.now() - i * 60_000).toISOString(),
      status: "Healthy" as const,
      probes: {healthy: b.healthy, total: b.total},
      latency: {p50: b.p50, p99: b.p50 * 2},
    })),
  };
}

describe("computeOverallUptime", () => {
  it("returns 100 for empty services", () => {
    expect(computeOverallUptime([])).toBe(100);
  });
  it("weighted by probe counts across services+buckets, 3-decimal precision", () => {
    const s = [
      mkSeries("arolariu.ro", [{healthy: 3, total: 3, p50: 100}, {healthy: 2, total: 3, p50: 200}]),
      mkSeries("cv.arolariu.ro", [{healthy: 6, total: 6, p50: 30}]),
    ];
    // (3+2+6) / (3+3+6) = 11/12 = 91.6666… → rounded to 91.667 at 3 decimals
    expect(computeOverallUptime(s)).toBe(91.667);
  });
  it("returns 3-decimal precision on tricky fractions", () => {
    // 1/3 healthy → 33.3333…% → 33.333
    const s = [mkSeries("arolariu.ro", [{healthy: 1, total: 3, p50: 100}])];
    expect(computeOverallUptime(s)).toBe(33.333);
  });
  it("rounds near-100 uptime to the 5-nines tier", () => {
    // 999_999 / 1_000_000 = 99.9999% → Math.round(99.9999 * 1000) / 1000 = 100
    const s = [mkSeries("arolariu.ro", [{healthy: 999_999, total: 1_000_000, p50: 100}])];
    expect(computeOverallUptime(s)).toBe(100);
    // 999_994 / 1_000_000 = 99.9994% → 99.999 (five nines)
    const s2 = [mkSeries("arolariu.ro", [{healthy: 999_994, total: 1_000_000, p50: 100}])];
    expect(computeOverallUptime(s2)).toBe(99.999);
  });
});

describe("computeAvgLatency", () => {
  it("returns 0 for empty", () => {
    expect(computeAvgLatency([])).toBe(0);
  });
  it("unweighted mean of p50 across buckets", () => {
    const s = [
      mkSeries("arolariu.ro", [{healthy: 1, total: 1, p50: 100}, {healthy: 1, total: 1, p50: 200}]),
      mkSeries("cv.arolariu.ro", [{healthy: 1, total: 1, p50: 300}]),
    ];
    expect(computeAvgLatency(s)).toBe(200); // (100+200+300)/3
  });
});

describe("computeIncidentCount", () => {
  const inc = (startedAt: string, status: "open" | "resolved"): IncidentsFile["incidents"][number] => ({
    id: `inc-${startedAt}`, service: "arolariu.ro", startedAt,
    severity: "Degraded", reason: "x", probeCount: 2, status,
    ...(status === "resolved" ? {resolvedAt: new Date(Date.parse(startedAt) + 3_600_000).toISOString(), durationMs: 3_600_000} : {}),
  } as IncidentsFile["incidents"][number]);

  it("returns zeros for null input", () => {
    expect(computeIncidentCount(null, "1d")).toEqual({total: 0, open: 0, resolved: 0});
  });
  it("splits open vs resolved, filters by window", () => {
    const now = Date.now();
    const withinWindow = new Date(now - 3 * 3_600_000).toISOString(); // 3h ago
    const outsideWindow = new Date(now - 48 * 3_600_000).toISOString(); // 2d ago
    const file: IncidentsFile = {
      generatedAt: new Date(now).toISOString(),
      incidents: [
        inc(withinWindow, "open"),
        inc(withinWindow, "resolved"),
        inc(outsideWindow, "resolved"), // outside 1d window
      ],
    };
    expect(computeIncidentCount(file, "1d")).toEqual({total: 2, open: 1, resolved: 1});
  });
});

describe("computeMttr", () => {
  it("returns undefined when no resolved in window", () => {
    expect(computeMttr(null, "1d")).toBeUndefined();
    expect(computeMttr({generatedAt: "2026-01-01T00:00:00Z", incidents: []}, "1d")).toBeUndefined();
  });
  it("mean durationMs of resolved incidents in window", () => {
    const now = Date.now();
    const start = new Date(now - 3 * 3_600_000).toISOString();
    const file: IncidentsFile = {
      generatedAt: new Date(now).toISOString(),
      incidents: [
        {id: "1", service: "arolariu.ro", startedAt: start, severity: "Degraded", reason: "x", probeCount: 2,
         status: "resolved", resolvedAt: start, durationMs: 60_000}, // 1 min
        {id: "2", service: "arolariu.ro", startedAt: start, severity: "Degraded", reason: "x", probeCount: 2,
         status: "resolved", resolvedAt: start, durationMs: 180_000}, // 3 min
      ] as IncidentsFile["incidents"],
    };
    expect(computeMttr(file, "1d")).toBe(120_000); // avg of 60k + 180k
  });
});
