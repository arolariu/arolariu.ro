import {describe, expect, it} from "vitest";

import {author} from "./author";

describe("author data", () => {
  it("is frozen at runtime", () => {
    expect(Object.isFrozen(author)).toBe(true);
  });

  it("has the canonical identity fields populated", () => {
    expect(author.name).toBeTypeOf("string");
    expect(author.name.length).toBeGreaterThan(0);
    expect(author.title).toBeTypeOf("string");
    expect(author.email).toMatch(/@/);
    expect(author.website).toMatch(/^https?:\/\//);
    expect(author.linkedin).toMatch(/linkedin\.com/i);
    expect(author.github).toMatch(/github\.com/i);
  });

  it("computes age dynamically from current year", () => {
    expect(author.age).toBeTypeOf("number");
    expect(author.age).toBeGreaterThan(0);
  });
});
