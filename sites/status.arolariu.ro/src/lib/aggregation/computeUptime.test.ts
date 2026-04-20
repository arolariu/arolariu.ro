import {describe, it, expect} from "vitest";
import type {Bucket} from "../types/status";
import {computeUptime} from "./computeUptime";

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

describe("computeUptime", () => {
  it("returns 100 when all healthy", () => {
    expect(computeUptime([mkBucket("Healthy"), mkBucket("Healthy"), mkBucket("Healthy")])).toBe(100);
  });
  it("returns 0 when all unhealthy", () => {
    expect(computeUptime([mkBucket("Unhealthy"), mkBucket("Unhealthy")])).toBe(0);
  });
  it("counts Degraded probes: total healthy / total probes across all buckets", () => {
    // Healthy (1/1) + Degraded (0/1) = 1 of 2 healthy = 50%
    const buckets = [mkBucket("Healthy"), mkBucket("Degraded")];
    expect(computeUptime(buckets)).toBe(50);
  });
  it("returns 100 when empty (no data = assume healthy)", () => {
    expect(computeUptime([])).toBe(100);
  });
});
