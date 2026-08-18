import {
  ClassificationOrigin,
  ClassificationSystem,
  AllergenAssessmentStatus,
  AllergenEvidenceLevel,
  type StandardClassification,
} from "@/types/invoices";
import {describe, expect, it} from "vitest";
import {
  formatClassificationConfidence,
  getClassificationLabel,
  getClassificationRoot,
  getClassificationSummary,
  getAllergenEvidenceLevelLabel,
  getAllergenStatusLabel,
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
    expect(getClassificationLabel(null)).toBe("Unclassified");
    expect(getClassificationRoot(null)).toBeNull();
    expect(getClassificationSummary(null)).toBe("Unclassified");
  });

  it("uses the official label, code, and root hierarchy node", () => {
    expect(getClassificationLabel(analysisClassification)).toBe("Food");
    expect(getClassificationRoot(analysisClassification)).toEqual(analysisClassification.hierarchy[0]);
    expect(getClassificationSummary(analysisClassification)).toBe("Food (01.1)");
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

  it("uses cautious status wording for every assessment outcome", () => {
    expect(getAllergenStatusLabel(AllergenAssessmentStatus.Detected)).toBe("Signals detected");
    expect(getAllergenStatusLabel(AllergenAssessmentStatus.NoSignals)).toBe("No signals in available evidence");
    expect(getAllergenStatusLabel(AllergenAssessmentStatus.InsufficientData)).toBe("Insufficient data");
  });

  it("labels every evidence tier without overstating certainty", () => {
    expect(getAllergenEvidenceLevelLabel(AllergenEvidenceLevel.Explicit)).toBe("Explicit evidence");
    expect(getAllergenEvidenceLevelLabel(AllergenEvidenceLevel.Inferred)).toBe("Inferred evidence");
    expect(getAllergenEvidenceLevelLabel(AllergenEvidenceLevel.Precautionary)).toBe("Precautionary evidence");
  });
});
