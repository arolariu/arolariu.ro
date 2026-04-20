import {describe, it, expect} from "vitest";
import type {Bucket} from "../types/status";
import {weightedUptime} from "./weightedUptime";

function mk(healthy: number, total: number): Bucket {
  return {
    t: "2026-04-19T14:00:00Z", status: "Healthy",
    probes: {healthy, total}, latency: {p50: 100, p99: 200},
  };
}

describe("weightedUptime", () => {
  it("returns 100 for empty buckets", () => {
    expect(weightedUptime([])).toBe(100);
  });

  it("returns 100 when every bucket has zero probes", () => {
    expect(weightedUptime([mk(0, 0), mk(0, 0)])).toBe(100);
  });

  it("weights by probe count — a 100-probe bucket dominates a 10-probe bucket", () => {
    // 50/100 (half healthy) + 10/10 (all healthy) → 60/110 → 54.5
    expect(weightedUptime([mk(50, 100), mk(10, 10)])).toBeCloseTo(54.5, 1);
  });

  it("rounds to 1 decimal place", () => {
    // 2/3 = 66.666... → 66.7
    expect(weightedUptime([mk(2, 3)])).toBe(66.7);
  });

  it("returns 100 for all-healthy buckets", () => {
    expect(weightedUptime([mk(10, 10), mk(20, 20)])).toBe(100);
  });

  it("returns 0 when zero healthy across positive total", () => {
    expect(weightedUptime([mk(0, 10), mk(0, 20)])).toBe(0);
  });
});
