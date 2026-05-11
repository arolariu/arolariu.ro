import {describe, expect, it} from "vitest";

import {interests} from "./interests";

describe("interests (JSON Resume interests block)", () => {
  it("is frozen at runtime", () => {
    expect(Object.isFrozen(interests)).toBe(true);
  });

  it("has at least one interest", () => {
    expect(interests.length).toBeGreaterThan(0);
  });

  it("every entry has name + non-empty keywords[]", () => {
    for (const i of interests) {
      expect(i.name).toBeTypeOf("string");
      expect(i.name.length).toBeGreaterThan(0);
      expect(i.keywords).toBeInstanceOf(Array);
      expect(i.keywords.length).toBeGreaterThan(0);
    }
  });
});
