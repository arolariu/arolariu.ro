import {describe, expect, it} from "vitest";

import {jsonResumeSkills} from "./jsonResumeSkills";

describe("jsonResumeSkills (JSON Resume skills block)", () => {
  it("is frozen at runtime", () => {
    expect(Object.isFrozen(jsonResumeSkills)).toBe(true);
  });

  it("has at least one skill group", () => {
    expect(jsonResumeSkills.length).toBeGreaterThan(0);
  });

  it("every entry has name + level + non-empty keywords[]", () => {
    for (const s of jsonResumeSkills) {
      expect(s.name).toBeTypeOf("string");
      expect(s.level).toBeTypeOf("string");
      expect(s.keywords).toBeInstanceOf(Array);
      expect(s.keywords.length).toBeGreaterThan(0);
    }
  });
});
