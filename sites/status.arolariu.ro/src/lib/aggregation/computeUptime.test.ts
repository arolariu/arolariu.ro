import {describe, it, expect} from "vitest";
import type {Bucket} from "../types/status";
import {computeUptime, computeAvgLatency} from "./computeUptime";

function mkBucket(status: "Healthy" | "Degraded" | "Unhealthy", p50 = 100, healthy = 1, total = 1): Bucket {
  return {
    t: "2026-04-19T14:00:00Z", status,
    probes: {healthy, total},
    latency: {p50, p99: p50 * 2},
  };
}

describe("computeUptime", () => {
  it("returns 100 when all healthy", () => {
    expect(computeUptime([mkBucket("Healthy"), mkBucket("Healthy"), mkBucket("Healthy")])).toBe(100);
  });
  it("returns 0 when all unhealthy", () => {
    expect(computeUptime([mkBucket("Unhealthy"), mkBucket("Unhealthy")])).toBe(0);
  });
  it("counts Degraded as partial (probes.healthy/total)", () => {
    const buckets = [mkBucket("Healthy"), mkBucket("Degraded", 100, 1, 2)];
    expect(computeUptime(buckets)).toBe(50);
  });
  it("returns 100 when empty (no data = assume healthy)", () => {
    expect(computeUptime([])).toBe(100);
  });
});

describe("computeAvgLatency", () => {
  it("averages p50 across buckets", () => {
    expect(computeAvgLatency([mkBucket("Healthy", 100), mkBucket("Healthy", 200)])).toBe(150);
  });
  it("returns 0 for empty", () => {
    expect(computeAvgLatency([])).toBe(0);
  });
});
