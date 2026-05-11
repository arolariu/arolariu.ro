import {describe, expect, it} from "vitest";

import {education, educationAsArray} from "./education";

describe("education data", () => {
  it("is frozen (both keyed map and flat array)", () => {
    expect(Object.isFrozen(education)).toBe(true);
    expect(Object.isFrozen(educationAsArray)).toBe(true);
  });

  it("contains exactly 3 entries", () => {
    expect(educationAsArray).toHaveLength(3);
  });

  it("every entry has required human-view fields", () => {
    for (const e of educationAsArray) {
      expect(e.degree).toBeTypeOf("string");
      expect(e.institution).toBeTypeOf("string");
      expect(e.location).toBeTypeOf("string");
      expect(e.period).toBeTypeOf("string");
      expect(e.status).toBeTypeOf("string");
    }
  });

  it("every entry has the JSON-Resume metadata used by /json", () => {
    for (const e of educationAsArray) {
      expect(e.area).toBeTypeOf("string");
      expect(e.studyType).toBeTypeOf("string");
      expect(e.startDate).toMatch(/^\d{4}/);
      expect(e.endDate).toMatch(/^\d{4}/);
    }
  });
});
