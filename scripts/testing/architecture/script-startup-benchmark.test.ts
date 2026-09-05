// @vitest-environment node

import {describe, expect, it, vi} from "vitest";

import {calculateMedianMilliseconds, measureInvocationMedianMilliseconds} from "./script-startup-benchmark.ts";

describe("script startup benchmark", () => {
  it("calculates odd and even medians deterministically", () => {
    expect(calculateMedianMilliseconds([9, 1, 5])).toBe(5);
    expect(calculateMedianMilliseconds([8, 2, 6, 4])).toBe(5);
  });

  it("measures the requested sample count with injected time and invocation", () => {
    const readings = [0, 10, 10, 30, 30, 50];
    const now = vi.fn(() => readings.shift() ?? 0);
    const invoke = vi.fn();

    expect(measureInvocationMedianMilliseconds({sampleCount: 3, invoke, now})).toBe(20);
    expect(invoke).toHaveBeenCalledTimes(3);
  });

  it("rejects empty samples and non-positive sample counts", () => {
    const invoke = vi.fn();

    expect(() => calculateMedianMilliseconds([])).toThrow("At least one timing sample is required.");
    expect(() => measureInvocationMedianMilliseconds({sampleCount: 0, invoke, now: () => 0})).toThrow(RangeError);
    expect(() => measureInvocationMedianMilliseconds({sampleCount: 1.5, invoke, now: () => 0})).toThrow(RangeError);
    expect(invoke).not.toHaveBeenCalled();
  });
});
