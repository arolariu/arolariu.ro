import {describe, expect, it} from "vitest";

import {languages} from "./languages";

describe("languages (JSON Resume languages block)", () => {
  it("is frozen at runtime", () => {
    expect(Object.isFrozen(languages)).toBe(true);
  });

  it("includes Romanian (native) and English (fluent)", () => {
    const names = languages.map((l) => l.language);
    expect(names).toContain("Romanian");
    expect(names).toContain("English");

    const romanian = languages.find((l) => l.language === "Romanian");
    expect(romanian?.fluency).toMatch(/native/i);
  });

  it("every entry has language + fluency", () => {
    for (const l of languages) {
      expect(l.language).toBeTypeOf("string");
      expect(l.fluency).toBeTypeOf("string");
    }
  });
});
