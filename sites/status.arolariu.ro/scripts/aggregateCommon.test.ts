// @vitest-environment node
import {describe, it, expect} from "vitest";
import {bucketStart, mode, percentile, worstStatus} from "./aggregateCommon";

describe("bucketStart", () => {
  it("rounds to 30-min boundaries", () => {
    expect(bucketStart(new Date("2026-04-19T14:17:12Z"), "30m")).toBe("2026-04-19T14:00:00.000Z");
    expect(bucketStart(new Date("2026-04-19T14:45:12Z"), "30m")).toBe("2026-04-19T14:30:00.000Z");
  });
  it("rounds to hour", () => {
    expect(bucketStart(new Date("2026-04-19T14:45:12Z"), "1h")).toBe("2026-04-19T14:00:00.000Z");
  });
  it("rounds to day", () => {
    expect(bucketStart(new Date("2026-04-19T14:45:12Z"), "1d")).toBe("2026-04-19T00:00:00.000Z");
  });
});

describe("worstStatus", () => {
  it("picks Unhealthy over anything", () => {
    expect(worstStatus("Healthy", "Unhealthy")).toBe("Unhealthy");
    expect(worstStatus("Unhealthy", "Degraded")).toBe("Unhealthy");
  });
  it("picks Degraded over Healthy", () => {
    expect(worstStatus("Healthy", "Degraded")).toBe("Degraded");
    expect(worstStatus("Degraded", "Healthy")).toBe("Degraded");
  });
  it("returns the same value when equal", () => {
    expect(worstStatus("Healthy", "Healthy")).toBe("Healthy");
  });
});

describe("percentile", () => {
  it("returns 0 for empty input", () => {
    expect(percentile([], 50)).toBe(0);
  });
  it("linearly interpolates between neighbouring ranks", () => {
    // rank 4.5 → (50+60)/2 = 55
    expect(percentile([10, 20, 30, 40, 50, 60, 70, 80, 90, 100], 50)).toBe(55);
  });
  it("clamps p99 at the top of the range", () => {
    expect(percentile([10, 20, 30, 40, 50, 60, 70, 80, 90, 100], 99)).toBe(99);
  });
});

describe("mode", () => {
  it("returns the most-frequent value", () => {
    expect(mode([1, 2, 2, 3, 2, 1])).toBe(2);
  });
  it("returns undefined for empty input", () => {
    expect(mode([])).toBeUndefined();
  });
});
