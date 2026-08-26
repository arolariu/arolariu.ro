/**
 * @fileoverview Tests for taxonomy-driven insight card routing.
 * @module app/domains/invoices/view-invoice/[id]/components/cards/insights/CategoryInsightsCardContainer.test
 */

import {ClassificationSystem, type Invoice, type StandardClassification} from "@/types/invoices";
import {render, screen} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";
import {CategoryInsightsCardContainer} from "./CategoryInsightsCardContainer";

const mockInvoice = vi.hoisted(() => ({current: null as Invoice | null}));

vi.mock("../../../_context/InvoiceContext", () => ({
  useInvoiceContext: () => ({invoice: mockInvoice.current}),
}));

vi.mock("./NutritionCard", () => ({NutritionCard: () => <div data-testid='card'>nutrition</div>}));
vi.mock("./DiningCard", () => ({DiningCard: () => <div data-testid='card'>dining</div>}));
vi.mock("./HomeInventoryCard", () => ({HomeInventoryCard: () => <div data-testid='card'>household</div>}));
vi.mock("./VehicleCard", () => ({VehicleCard: () => <div data-testid='card'>vehicle</div>}));
vi.mock("./GeneralExpenseCard", () => ({GeneralExpenseCard: () => <div data-testid='card'>general</div>}));
vi.mock("./CategorySuggestionCard", () => ({CategorySuggestionCard: () => <div data-testid='card'>suggestion</div>}));

/** Builds an ECOICOP classification rooted at the supplied division code. */
function ecoicop(divisionCode: string): StandardClassification {
  return {
    system: ClassificationSystem.EcoicopV2,
    version: "2",
    code: `${divisionCode}.1.1`,
    officialLabel: "Leaf label",
    hierarchy: [
      {level: "division", code: divisionCode, officialLabel: "Division label"},
      {level: "group", code: `${divisionCode}.1`, officialLabel: "Group label"},
      {level: "class", code: `${divisionCode}.1.1`, officialLabel: "Leaf label"},
    ],
    origin: "Analysis",
    confidence: 0.9,
    evidence: [],
  };
}

/** Renders the container for an invoice carrying the supplied classification. */
function renderWith(classification: StandardClassification | null): void {
  mockInvoice.current = {classification} as Invoice;
  render(<CategoryInsightsCardContainer />);
}

describe("CategoryInsightsCardContainer", () => {
  it("routes ECOICOP division 01 to the nutrition card", () => {
    // Division 01 is literally "Food and non-alcoholic beverages", so this is the
    // only place the structured allergen evidence UI becomes reachable.
    renderWith(ecoicop("01"));

    expect(screen.getByTestId("card")).toHaveTextContent("nutrition");
  });

  it("routes ECOICOP division 11 to the dining card", () => {
    renderWith(ecoicop("11"));

    expect(screen.getByTestId("card")).toHaveTextContent("dining");
  });

  it("routes ECOICOP division 05 to the household card", () => {
    renderWith(ecoicop("05"));

    expect(screen.getByTestId("card")).toHaveTextContent("household");
  });

  it("routes ECOICOP division 07 to the vehicle card", () => {
    renderWith(ecoicop("07"));

    expect(screen.getByTestId("card")).toHaveTextContent("vehicle");
  });

  it("falls back to the general card for a division with no dedicated insight", () => {
    renderWith(ecoicop("06"));

    expect(screen.getByTestId("card")).toHaveTextContent("general");
  });

  it("prompts for classification when the invoice is unclassified", () => {
    renderWith(null);

    expect(screen.getByTestId("card")).toHaveTextContent("suggestion");
  });

  it("prompts for classification when the classification is from another taxonomy", () => {
    const naceClassification: StandardClassification = {
      ...ecoicop("01"),
      system: ClassificationSystem.Nace21,
    };

    renderWith(naceClassification);

    expect(screen.getByTestId("card")).toHaveTextContent("suggestion");
  });

  it("prompts for classification when the hierarchy is empty", () => {
    // The backend guarantees a non-empty hierarchy, but the TypeScript type permits
    // an empty one, so the fallback must not crash or silently pick a wrong card.
    const withoutHierarchy: StandardClassification = {...ecoicop("01"), hierarchy: []};

    renderWith(withoutHierarchy);

    expect(screen.getByTestId("card")).toHaveTextContent("suggestion");
  });
});
