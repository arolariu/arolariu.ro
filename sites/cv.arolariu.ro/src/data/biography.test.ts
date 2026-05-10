import {describe, expect, it} from "vitest";

import {biography} from "./biography";

describe("biography data", () => {
  it("is frozen at runtime", () => {
    expect(Object.isFrozen(biography)).toBe(true);
  });

  it("provides 5 narrative points, all non-empty", () => {
    expect(biography.firstPoint).toBeTypeOf("string");
    expect(biography.secondPoint).toBeTypeOf("string");
    expect(biography.thirdPoint).toBeTypeOf("string");
    expect(biography.fourthPoint).toBeTypeOf("string");
    expect(biography.fifthPoint).toBeTypeOf("string");
    for (const point of Object.values(biography)) {
      expect(point.length).toBeGreaterThan(0);
    }
  });
});
