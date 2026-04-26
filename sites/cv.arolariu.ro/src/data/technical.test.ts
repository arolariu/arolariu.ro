import {describe, expect, it} from "vitest";

import {techInfo} from "./technical";

describe("techInfo", () => {
  it("reports Sass-based styling dependencies instead of Tailwind CSS", () => {
    const dependencyNames = techInfo.dependencies.map((dependency) => dependency.name);

    expect(dependencyNames).toContain("Sass");
    expect(dependencyNames).not.toContain("Tailwind CSS");
  });
});
