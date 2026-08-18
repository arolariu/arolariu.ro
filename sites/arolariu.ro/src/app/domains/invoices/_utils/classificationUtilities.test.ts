import {ClassificationOrigin, ClassificationSystem, type StandardClassification} from "@/types/invoices";
import {describe, expect, it} from "vitest";
import {
  formatClassificationConfidence,
  getClassificationLabel,
  getClassificationRoot,
  getClassificationSummary,
} from "./classificationUtilities";

const analysisClassification: StandardClassification = {
  system: ClassificationSystem.EcoicopV2,
  version: "2026.08",
  code: "01.1",
  officialLabel: "Food",
  hierarchy: [
    {level: "division", code: "01", officialLabel: "Food and non-alcoholic beverages"},
    {level: "group", code: "01.1", officialLabel: "Food"},
  ],
  origin: ClassificationOrigin.Analysis,
  confidence: 0.87,
  evidence: [{source: "receipt", value: "Weekly food shop"}],
};

describe("classificationUtilities", () => {
  it("renders an honest explicit fallback for an unclassified value", () => {
    expect(getClassificationLabel(null, "Unclassified")).toBe("Unclassified");
    expect(getClassificationRoot(null)).toBeNull();
    expect(getClassificationSummary(null, "Unclassified")).toBe("Unclassified");
  });

  it("uses the official label, code, and root hierarchy node", () => {
    expect(getClassificationLabel(analysisClassification, "Unclassified")).toBe("Food");
    expect(getClassificationRoot(analysisClassification)).toEqual(analysisClassification.hierarchy[0]);
    expect(getClassificationSummary(analysisClassification, "Unclassified")).toBe("Food (01.1)");
  });

  it("shows bounded confidence only for analysis-origin classifications", () => {
    expect(formatClassificationConfidence(analysisClassification)).toBe("87%");

    const manualClassification: StandardClassification = {
      ...analysisClassification,
      origin: ClassificationOrigin.Manual,
      confidence: null,
    };

    expect(formatClassificationConfidence(manualClassification)).toBeNull();
  });

  it("does not invent confidence when an analysis result has no confidence", () => {
    const confidenceUnavailable: StandardClassification = {
      ...analysisClassification,
      confidence: null,
    };

    expect(formatClassificationConfidence(confidenceUnavailable)).toBeNull();
  });
});
