import {describe, expect, it} from "vitest";

import {footer, techInfo} from "./technical";

describe("technical (UI chrome) data", () => {
  it("are frozen at runtime", () => {
    expect(Object.isFrozen(techInfo)).toBe(true);
    expect(Object.isFrozen(footer)).toBe(true);
  });

  it("techInfo carries the build/runtime metadata used by Help dialog", () => {
    expect(techInfo.version).toBeTypeOf("string");
    expect(techInfo.framework).toBeTypeOf("string");
    expect(techInfo.cloudProvider).toBeTypeOf("string");
    expect(techInfo.dependencies).toBeInstanceOf(Array);
    expect(techInfo.dependencies.length).toBeGreaterThan(0);
  });

  it("footer carries copyright and the three named profile links", () => {
    expect(footer.copyright).toContain("Olariu");
    expect(footer.links.github.url).toMatch(/github\.com/i);
    expect(footer.links.linkedin.url).toMatch(/linkedin\.com/i);
    expect(footer.links.website.url).toMatch(/^https?:\/\//);
  });
});
