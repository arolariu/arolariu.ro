import {describe, it, expect, vi, beforeEach, afterEach} from "vitest";
import type {AggregateFile} from "../types/status";
import {sliceWindow} from "./sliceWindow";

function mkFile(buckets: string[]): AggregateFile {
  return {
    generatedAt: "2026-04-19T14:00:00Z",
    bucketSize: "30m", windowDays: 14,
    services: [{
      service: "arolariu.ro",
      buckets: buckets.map(t => ({
        t, status: "Healthy" as const,
        probes: {healthy: 1, total: 1},
        latency: {p50: 100, p99: 100},
      })),
    }],
  };
}

describe("sliceWindow", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-19T14:00:00Z"));
  });
  afterEach(() => { vi.useRealTimers(); });

  it("1d keeps buckets within 24h", () => {
    const file = mkFile([
      "2026-04-17T14:00:00Z",
      "2026-04-18T14:00:00Z",
      "2026-04-19T12:00:00Z",
    ]);
    const out = sliceWindow(file, "1d");
    expect(out.services[0]!.buckets).toHaveLength(2);
    expect(out.services[0]!.buckets.some(b => b.t === "2026-04-17T14:00:00Z")).toBe(false);
  });

  it("drops future buckets (clock skew guard)", () => {
    const file = mkFile(["2030-01-01T00:00:00Z", "2026-04-19T12:00:00Z"]);
    const out = sliceWindow(file, "1d");
    expect(out.services[0]!.buckets).toHaveLength(1);
    expect(out.services[0]!.buckets[0]!.t).toBe("2026-04-19T12:00:00Z");
  });

  it("slices subSeries in parallel", () => {
    const inFile: AggregateFile = {
      generatedAt: "2026-04-19T14:00:00Z", bucketSize: "30m", windowDays: 14,
      services: [{
        service: "api.arolariu.ro",
        buckets: [{t: "2026-04-19T12:00:00Z", status: "Healthy", probes: {healthy: 1, total: 1}, latency: {p50: 10, p99: 10}}],
        subSeries: {
          mssql: [
            {t: "2026-04-10T00:00:00Z", status: "Healthy", probes: {healthy: 1, total: 1}, latency: {p50: 1, p99: 1}},
            {t: "2026-04-19T12:00:00Z", status: "Healthy", probes: {healthy: 1, total: 1}, latency: {p50: 1, p99: 1}},
          ],
        },
      }],
    };
    const out = sliceWindow(inFile, "1d");
    expect(out.services[0]!.subSeries!["mssql"]).toHaveLength(1);
  });
});
