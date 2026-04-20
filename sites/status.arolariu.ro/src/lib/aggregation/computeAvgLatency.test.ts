import {describe, it, expect} from "vitest";
import type {Bucket} from "../types/status";
import {computeAvgLatency} from "./computeAvgLatency";

function mkBucket(
  status: "Healthy" | "Degraded" | "Unhealthy",
  p50 = 100,
  healthy = status === "Healthy" ? 1 : 0,
  total = 1,
): Bucket {
  return {
    t: "2026-04-19T14:00:00Z", status,
    probes: {healthy, total},
    latency: {p50, p99: p50 * 2},
  };
}

describe("computeAvgLatency", () => {
  it("averages p50 across buckets", () => {
    expect(computeAvgLatency([mkBucket("Healthy", 100), mkBucket("Healthy", 200)])).toBe(150);
  });
  it("returns 0 for empty", () => {
    expect(computeAvgLatency([])).toBe(0);
  });
});
