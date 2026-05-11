import {describe, expect, it} from "vitest";

import {experiences, experiencesAsArray, parseList} from "./experiences";

describe("experiences data", () => {
  it("is frozen (both keyed map and flat array)", () => {
    expect(Object.isFrozen(experiences)).toBe(true);
    expect(Object.isFrozen(experiencesAsArray)).toBe(true);
  });

  it("contains exactly 5 roles", () => {
    expect(experiencesAsArray).toHaveLength(5);
  });

  it("every entry has required human-view fields", () => {
    for (const e of experiencesAsArray) {
      expect(e.title).toBeTypeOf("string");
      expect(e.company).toBeTypeOf("string");
      expect(e.location).toBeTypeOf("string");
      expect(e.period).toBeTypeOf("string");
      expect(e.description).toBeTypeOf("string");
    }
  });

  it("every entry has the JSON-Resume metadata used by /json", () => {
    for (const e of experiencesAsArray) {
      expect(e.url).toBeTypeOf("string");
      expect(e.startDate).toMatch(/^\d{4}/);
      expect(e.summary).toBeTypeOf("string");
    }
  });

  it("includes the load-bearing role keys", () => {
    expect(experiences).toHaveProperty("microsoft3");
    expect(experiences).toHaveProperty("microsoft2");
    expect(experiences).toHaveProperty("microsoft1");
    expect(experiences).toHaveProperty("intel");
    expect(experiences).toHaveProperty("ubisoft");
  });
});

describe("parseList helper", () => {
  it("splits #-separated strings", () => {
    expect(parseList("a # b # c")).toEqual(["a", "b", "c"]);
  });

  it("filters out empty / whitespace-only entries", () => {
    expect(parseList(" #  # foo #  ")).toEqual(["foo"]);
  });

  it("returns an empty array for an empty / whitespace string", () => {
    expect(parseList(" ")).toEqual([]);
    expect(parseList("")).toEqual([]);
  });
});
