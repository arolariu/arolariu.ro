import {describe, expect, it} from "vitest";

import {help, landing} from "./landing";

describe("landing-page strings", () => {
  it("are frozen at runtime", () => {
    expect(Object.isFrozen(landing)).toBe(true);
    expect(Object.isFrozen(help)).toBe(true);
  });

  it("expose title + subtitle + footer", () => {
    expect(landing.title).toBeTypeOf("string");
    expect(landing.subtitle).toBeTypeOf("string");
    expect(landing.footer).toBeTypeOf("string");
  });

  it("help dialog content has title + description", () => {
    expect(help.title).toBeTypeOf("string");
    expect(help.description).toBeTypeOf("string");
  });
});
