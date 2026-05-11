import {describe, expect, it} from "vitest";

import {projects} from "./projects";

describe("projects (JSON Resume projects block)", () => {
  it("is frozen at runtime", () => {
    expect(Object.isFrozen(projects)).toBe(true);
  });

  it("has at least one flagship project", () => {
    expect(projects.length).toBeGreaterThan(0);
  });

  it("every project has name + description", () => {
    for (const p of projects) {
      expect(p.name).toBeTypeOf("string");
      expect(p.description).toBeTypeOf("string");
    }
  });

  it("includes the arolariu.ro Platform", () => {
    expect(projects[0]?.name).toBe("arolariu.ro Platform");
  });
});
