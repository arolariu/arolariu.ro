import {describe, expect, it} from "vitest";

import {certificationsAsArray} from "./certifications";

describe("certifications data", () => {
  it("contains exactly 9 certifications", () => {
    expect(certificationsAsArray).toHaveLength(9);
  });

  it("every entry has code, name, issueDate, issuer, and category", () => {
    for (const cert of certificationsAsArray) {
      expect(cert.code).toBeTypeOf("string");
      expect(cert.name).toBeTypeOf("string");
      expect(cert.issueDate).toBeTypeOf("string");
      expect(cert.issuer).toBeTypeOf("string");
      expect(["Microsoft", "GitHub"]).toContain(cert.category);
    }
  });

  it("groups into 5 Microsoft + 4 GitHub credentials", () => {
    const microsoft = certificationsAsArray.filter((c) => c.category === "Microsoft");
    const github = certificationsAsArray.filter((c) => c.category === "GitHub");
    expect(microsoft).toHaveLength(5);
    expect(github).toHaveLength(4);
  });

  it("includes the 5 Microsoft codes (AB-730, AB-731, AZ-900, AI-900, SC-900)", () => {
    const codes = certificationsAsArray.filter((c) => c.category === "Microsoft").map((c) => c.code);
    expect(codes).toEqual(expect.arrayContaining(["AB-730", "AB-731", "AZ-900", "AI-900", "SC-900"]));
  });

  it("includes the 4 GitHub codes (GH-900, GH-100, GH-200, GH-300)", () => {
    const codes = certificationsAsArray.filter((c) => c.category === "GitHub").map((c) => c.code);
    expect(codes).toEqual(expect.arrayContaining(["GH-900", "GH-100", "GH-200", "GH-300"]));
  });
});
