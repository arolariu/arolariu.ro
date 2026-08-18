import {describe, expect, it} from "vitest";
import {
  ClassificationSystem,
  isSearchClassificationsInput,
  isTaxonomyArtifact,
  normalizeClassificationSearchQuery,
} from "./Classification";

describe("classification contracts", () => {
  it("normalizes Unicode taxonomy queries", () => {
    expect(normalizeClassificationSearchQuery("  Crème—Brûlée  ")).toBe("creme brulee");
  });

  it("validates bounded search input", () => {
    expect(isSearchClassificationsInput({system: ClassificationSystem.Nace21, query: "47", limit: 10})).toBe(true);
    expect(isSearchClassificationsInput({system: ClassificationSystem.Nace21, query: "x", limit: 10})).toBe(false);
    expect(isSearchClassificationsInput({system: ClassificationSystem.Nace21, query: "47", limit: 51})).toBe(false);
  });

  it("rejects non-RFC3339 artifact timestamps", () => {
    expect(
      isTaxonomyArtifact({
        system: "NACE_2_1",
        version: "2.1",
        sourceUrl: "https://example.test",
        generatedAt: "2026-08-19",
        attribution: "Test",
        nodes: [],
      }),
    ).toBe(false);
  });
});
