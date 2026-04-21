import {describe, expect, it} from "vitest";
import {formatDuration} from "./formatDuration";

describe("formatDuration", () => {
  it("returns em dash for undefined", () => {
    expect(formatDuration(undefined)).toBe("—");
  });

  it("returns em dash for NaN", () => {
    expect(formatDuration(NaN)).toBe("—");
  });

  it("returns em dash for Infinity", () => {
    expect(formatDuration(Infinity)).toBe("—");
  });

  it("returns em dash for -Infinity", () => {
    expect(formatDuration(-Infinity)).toBe("—");
  });

  it("returns '0 min' for 0 ms", () => {
    expect(formatDuration(0)).toBe("0 min");
  });

  it("rounds sub-minute durations to 0 min", () => {
    expect(formatDuration(45_000)).toBe("1 min");
  });

  it("returns minutes for durations under 60 min", () => {
    expect(formatDuration(30 * 60_000)).toBe("30 min");
    expect(formatDuration(59 * 60_000)).toBe("59 min");
  });

  it("returns whole hours when no remainder", () => {
    expect(formatDuration(60 * 60_000)).toBe("1 h");
    expect(formatDuration(3 * 60 * 60_000)).toBe("3 h");
  });

  it("returns hours and minutes when remainder exists", () => {
    expect(formatDuration(90 * 60_000)).toBe("1 h 30 min");
    expect(formatDuration((2 * 60 + 15) * 60_000)).toBe("2 h 15 min");
  });
});
