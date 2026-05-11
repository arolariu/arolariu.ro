import {describe, expect, it} from "vitest";

import {competencies} from "./competencies";

describe("competencies data", () => {
  it("is frozen at runtime", () => {
    expect(Object.isFrozen(competencies)).toBe(true);
  });

  it("contains exactly 6 competencies, each with title + description", () => {
    const entries = Object.values(competencies);
    expect(entries).toHaveLength(6);
    for (const c of entries) {
      expect(c.title).toBeTypeOf("string");
      expect(c.title.length).toBeGreaterThan(0);
      expect(c.description.length).toBeGreaterThan(0);
    }
  });

  it("includes the load-bearing competency keys", () => {
    expect(competencies).toHaveProperty("engineeringExcellence");
    expect(competencies).toHaveProperty("testDrivenDevelopment");
    expect(competencies).toHaveProperty("domainDrivenDesign");
    expect(competencies).toHaveProperty("customerCentric");
    expect(competencies).toHaveProperty("agileMethodologies");
    expect(competencies).toHaveProperty("algorithmicSkills");
  });
});
