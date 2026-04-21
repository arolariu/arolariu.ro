import {describe, it, expect} from "vitest";
import {latencyTier, LATENCY_THRESHOLDS} from "./latencyTier";

describe("latencyTier", () => {
  it("classifies well-below-200 p50 as 'fast'", () => {
    expect(latencyTier(0)).toBe("fast");
    expect(latencyTier(199)).toBe("fast");
  });

  it("classifies p50 in [200, 500) as 'ok'", () => {
    expect(latencyTier(200)).toBe("ok");
    expect(latencyTier(499)).toBe("ok");
  });

  it("classifies p50 ≥ 500 as 'slow'", () => {
    expect(latencyTier(500)).toBe("slow");
    expect(latencyTier(2000)).toBe("slow");
  });

  it("uses LATENCY_THRESHOLDS as the tier boundaries (inclusive-lower, exclusive-upper)", () => {
    // Boundary contract — if thresholds drift, the 4 consumers will all follow.
    expect(latencyTier(LATENCY_THRESHOLDS.fast - 1)).toBe("fast");
    expect(latencyTier(LATENCY_THRESHOLDS.fast)).toBe("ok");
    expect(latencyTier(LATENCY_THRESHOLDS.ok - 1)).toBe("ok");
    expect(latencyTier(LATENCY_THRESHOLDS.ok)).toBe("slow");
  });
});
