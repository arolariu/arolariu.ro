import {describe, it, expect} from "vitest";
import {computeWeekdayUptime} from "./weekdayUptime";
import type {ServiceSeries} from "../types/status";

function bucketAt(iso: string, healthy: number, total: number) {
  return {t: iso, status: "Healthy" as const, probes: {healthy, total}, latency: {p50: 0, p99: 0}};
}

describe("computeWeekdayUptime", () => {
  it("returns 7 values Mon..Sun", () => {
    const out = computeWeekdayUptime([]);
    expect(out).toHaveLength(7);
    expect(out.every(v => v === 100)).toBe(true);
  });

  it("groups by weekday correctly", () => {
    // 2026-04-20 is a Monday
    const svc: ServiceSeries = {
      service: "arolariu.ro",
      buckets: [
        bucketAt("2026-04-20T00:00:00Z", 50, 100), // Mon — 50%
        bucketAt("2026-04-21T00:00:00Z", 100, 100), // Tue — 100%
      ],
    };
    const out = computeWeekdayUptime([svc]);
    expect(out[0]).toBe(50);  // Mon
    expect(out[1]).toBe(100); // Tue
    expect(out[2]).toBe(100); // Wed (no data = 100)
  });

  it("aggregates across services same weekday", () => {
    const svcA: ServiceSeries = {
      service: "arolariu.ro",
      buckets: [bucketAt("2026-04-20T00:00:00Z", 100, 100)],
    };
    const svcB: ServiceSeries = {
      service: "api.arolariu.ro",
      buckets: [bucketAt("2026-04-20T12:00:00Z", 0, 100)],
    };
    const out = computeWeekdayUptime([svcA, svcB]);
    expect(out[0]).toBe(50); // Mon: 100 healthy / 200 total = 50%
  });

  it("rounds to 1 decimal", () => {
    const svc: ServiceSeries = {
      service: "arolariu.ro",
      buckets: [bucketAt("2026-04-20T00:00:00Z", 1, 3)],
    };
    const out = computeWeekdayUptime([svc]);
    expect(out[0]).toBe(33.3);
  });
});
