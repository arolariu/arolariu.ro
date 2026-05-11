import {describe, expect, it} from "vitest";

import {jsonResumeTechnical} from "./jsonResumeTechnical";

describe("jsonResumeTechnical (JSON Resume technical inventory)", () => {
  it("is frozen at runtime", () => {
    expect(Object.isFrozen(jsonResumeTechnical)).toBe(true);
  });

  it("populates every category with at least one entry", () => {
    expect(jsonResumeTechnical.operatingSystems.length).toBeGreaterThan(0);
    expect(jsonResumeTechnical.databases.length).toBeGreaterThan(0);
    expect(jsonResumeTechnical.tools.length).toBeGreaterThan(0);
    expect(jsonResumeTechnical.methodologies.length).toBeGreaterThan(0);
    expect(jsonResumeTechnical.testing.length).toBeGreaterThan(0);
    expect(jsonResumeTechnical.security.length).toBeGreaterThan(0);
    expect(jsonResumeTechnical.performance.length).toBeGreaterThan(0);
    expect(jsonResumeTechnical.softSkills.length).toBeGreaterThan(0);
  });
});
