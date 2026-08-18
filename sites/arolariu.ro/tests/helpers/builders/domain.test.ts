import {AllergenAssessmentStatus, ClassificationSystem, isRecipeSuggestion} from "../../../src/types/invoices";
import {describe, expect, it} from "vitest";
import {
  buildAllergenAssessment,
  buildClassification,
  buildInvoiceAnalysisRequest,
  buildMerchantAnalysisRequest,
  buildRecipe,
} from "./domain";

describe("domain builders", () => {
  it("builds canonical classifications and structured recipes", () => {
    expect(buildClassification().system).toBe(ClassificationSystem.EcoicopV2);
    expect(buildRecipe().steps).toHaveLength(1);
    expect(isRecipeSuggestion(buildRecipe())).toBe(true);
  });

  it("builds cautious no-signals evidence", () => {
    expect(buildAllergenAssessment().status).toBe(AllergenAssessmentStatus.NoSignals);
  });

  it("builds exact analysis request shapes", () => {
    expect(buildInvoiceAnalysisRequest()).toMatchObject({profile: "balanced", overrides: {}});
    expect(buildMerchantAnalysisRequest()).toMatchObject({profile: "balanced", overrides: {}});
  });
});
