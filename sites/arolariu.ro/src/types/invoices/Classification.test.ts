import {describe, expect, it} from "vitest";
import {
  ClassificationSystem,
  isSearchClassificationsInput,
  isTaxonomyArtifact,
  normalizeClassificationSearchQuery,
  resolveClassificationCodeForWrite,
  type StandardClassification,
} from "./Classification";

describe("resolveClassificationCodeForWrite", () => {
  const base = {
    system: ClassificationSystem.EcoicopV2,
    code: "01.1.1",
    version: "2.0",
    officialLabel: "Bread and cereals",
    hierarchy: [],
    confidence: null,
    evidence: [],
  } as const;

  it("sends null for an unclassified entity", () => {
    expect(resolveClassificationCodeForWrite(null)).toBeNull();
  });

  it("sends null for an analysis-derived classification so the server preserves it", () => {
    // Echoing the code back would make the backend re-resolve it as Manual,
    // discarding the origin, confidence and evidence produced by analysis.
    const analysis: StandardClassification = {...base, origin: "Analysis", confidence: 0.87};

    expect(resolveClassificationCodeForWrite(analysis)).toBeNull();
  });

  it("sends the code for a user-chosen manual classification", () => {
    const manual: StandardClassification = {...base, origin: "Manual"};

    expect(resolveClassificationCodeForWrite(manual)).toBe("01.1.1");
  });
});

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
        nodes: [
          {
            code: "A",
            officialLabel: "Agriculture",
            level: "section",
            parentCode: null,
            hierarchyCodes: ["A"],
            hierarchyLabels: ["Agriculture"],
            definition: null,
            searchText: "a agriculture",
          },
        ],
      }),
    ).toBe(false);
  });

  it("rejects impossible RFC3339 calendar dates", () => {
    expect(
      isTaxonomyArtifact({
        system: "NACE_2_1",
        version: "2.1",
        sourceUrl: "https://example.test",
        generatedAt: "2026-02-30T00:00:00Z",
        attribution: "Test",
        nodes: [
          {
            code: "A",
            officialLabel: "Agriculture",
            level: "section",
            parentCode: null,
            hierarchyCodes: ["A"],
            hierarchyLabels: ["Agriculture"],
            definition: null,
            searchText: "a agriculture",
          },
        ],
      }),
    ).toBe(false);
  });
});
