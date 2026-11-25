/**
 * @fileoverview Tests for taxonomy-driven insight card routing.
 * @module app/domains/invoices/view-invoice/[id]/components/cards/insights/CategoryInsightsCardContainer.test
 */

import {InvoiceCategory, type Invoice} from "@/types/invoices";
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

/** Renders the container for an invoice carrying the supplied classification. */
function renderWith(category: InvoiceCategory | null): void {
  mockInvoice.current = {category} as Invoice;
  render(<CategoryInsightsCardContainer />);
}

describe("CategoryInsightsCardContainer", () => {
  it("routes groceries to the nutrition card", () => {
    renderWith(InvoiceCategory.Groceries);

    expect(screen.getByTestId("card")).toHaveTextContent("nutrition");
  });

  it("routes dining receipts to the dining card", () => {
    renderWith(InvoiceCategory.RestaurantDining);

    expect(screen.getByTestId("card")).toHaveTextContent("dining");
  });

  it("routes cleaning supplies to the household card", () => {
    renderWith(InvoiceCategory.CleaningSupplies);

    expect(screen.getByTestId("card")).toHaveTextContent("household");
  });

  it("routes fuel receipts to the vehicle card", () => {
    renderWith(InvoiceCategory.VehicleFuel);

    expect(screen.getByTestId("card")).toHaveTextContent("vehicle");
  });

  it("falls back to the general card for a division with no dedicated insight", () => {
    renderWith(InvoiceCategory.Other);

    expect(screen.getByTestId("card")).toHaveTextContent("general");
  });

  it("prompts for classification when the invoice is unclassified", () => {
    renderWith(null);

    expect(screen.getByTestId("card")).toHaveTextContent("suggestion");
  });
});
