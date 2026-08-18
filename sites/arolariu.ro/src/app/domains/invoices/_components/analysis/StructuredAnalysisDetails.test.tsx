import {
  AllergenAssessmentStatus,
  AllergenCode,
  ClassificationOrigin,
  ClassificationSystem,
  type AllergenAssessment,
  type StandardClassification,
} from "@/types/invoices";
import {render, screen, type RenderResult} from "@testing-library/react";
import {NextIntlClientProvider} from "next-intl";
import type {ReactNode} from "react";
import {describe, expect, it} from "vitest";
import enMessages from "../../../../../../messages/en.json";
import roMessages from "../../../../../../messages/ro.json";
import {AllergenAssessmentDetails, ClassificationProvenance, RecipeSuggestionDetails} from "./StructuredAnalysisDetails";
import {buildRecipe} from "../../../../../../tests/helpers/builders/domain";

function renderWithLocale(children: ReactNode): RenderResult {
  return render(
    <NextIntlClientProvider
      locale='en'
      messages={enMessages}>
      {children}
    </NextIntlClientProvider>,
  );
}

const detectedAssessment: AllergenAssessment = {
  status: AllergenAssessmentStatus.Detected,
  signals: [
    {
      code: AllergenCode.Milk,
      evidenceLevel: "explicit",
      confidence: 0.95,
      evidence: [{source: "ingredients", value: "milk"}],
    },
  ],
};

const analysisClassification: StandardClassification = {
  system: ClassificationSystem.Gs1Gpc,
  version: "2.1",
  code: "10000234",
  officialLabel: "Milk",
  hierarchy: [
    {level: "segment", code: "10000000", officialLabel: "Food/Beverage/Tobacco"},
    {level: "brick", code: "10000234", officialLabel: "Milk"},
  ],
  origin: ClassificationOrigin.Analysis,
  confidence: 0.8,
  evidence: [{source: "receipt", value: "Milk"}],
};

describe("StructuredAnalysisDetails", () => {
  it.each([
    ["not assessed", null, "Not assessed"],
    ["no signals", {status: AllergenAssessmentStatus.NoSignals, signals: []}, "No signals in available evidence"],
    ["insufficient data", {status: AllergenAssessmentStatus.InsufficientData, signals: []}, "Insufficient data"],
    ["detected", detectedAssessment, "Signals detected"],
  ] as const)("renders the honest %s allergen state", (_name, assessment, expected) => {
    renderWithLocale(<AllergenAssessmentDetails assessment={assessment} />);

    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it("renders detected EU-14 code, evidence level, confidence, and evidence text", () => {
    renderWithLocale(<AllergenAssessmentDetails assessment={detectedAssessment} />);

    expect(screen.getByText("Milk")).toBeInTheDocument();
    expect(screen.getByText(/Explicit evidence/)).toBeInTheDocument();
    expect(screen.getByText(/Advisory confidence: 95%/)).toBeInTheDocument();
    expect(screen.getByText("ingredients: milk")).toBeInTheDocument();
  });

  it("uses the active locale catalog for honest allergen state copy", () => {
    expect(enMessages.cards.invoices.analysisResults.allergens.noSignals).toBe("No signals in available evidence");
    expect(roMessages.cards.invoices.analysisResults.allergens.notAssessed).toBe("Neevaluat");
  });

  it("renders canonical classification provenance without inventing manual confidence", () => {
    const rendered = renderWithLocale(<ClassificationProvenance classification={analysisClassification} />);

    expect(screen.getByText("Analysis result")).toBeInTheDocument();
    expect(screen.getByText(/Advisory confidence: 80%/)).toBeInTheDocument();
    expect(screen.getByText("Root: Food/Beverage/Tobacco (10000000)")).toBeInTheDocument();

    rendered.unmount();
    renderWithLocale(
      <ClassificationProvenance classification={{...analysisClassification, origin: ClassificationOrigin.Manual, confidence: null}} />,
    );

    expect(screen.getByText("Manual selection")).toBeInTheDocument();
    expect(screen.queryByText(/Advisory confidence/)).toBeNull();
  });

  it("renders complete recipe groups, timing, ordered steps, and warnings", () => {
    renderWithLocale(
      <RecipeSuggestionDetails
        recipe={buildRecipe({
          purchasedIngredients: [{name: "Pasta", quantity: "200 g", preparation: null}],
          assumedPantryStaples: [{name: "Salt", quantity: "a pinch", preparation: null}],
          missingOptionalIngredients: [{name: "Basil", quantity: "a handful", preparation: null}],
          allergenWarnings: [AllergenCode.CerealsContainingGluten],
        })}
      />,
    );

    expect(screen.getByText("Easy")).toBeInTheDocument();
    expect(screen.getByText("Purchased ingredients")).toBeInTheDocument();
    expect(screen.getByText("Assumed pantry staples")).toBeInTheDocument();
    expect(screen.getByText("Missing optional ingredients")).toBeInTheDocument();
    expect(screen.getByText("Preparation steps")).toBeInTheDocument();
    expect(screen.getByText("Allergen warnings")).toBeInTheDocument();
    expect(screen.getByText("Total: 25 min")).toBeInTheDocument();
  });
});
