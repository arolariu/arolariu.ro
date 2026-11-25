/**
 * @fileoverview Unit tests for the CategoryFilterCard invoice filter.
 * @module app/domains/invoices/view-invoices/_components/filters/CategoryFilterCard.test
 */

import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, it, vi} from "vitest";
import type {FilterState} from "../../_hooks/useInvoiceFilters";
import {UNCATEGORIZED_FILTER} from "../../_utils/filterOptions";
import {CategoryFilterCard} from "./CategoryFilterCard";

/** The title renders after a decorative emoji, so match the translated key at the end of the title text. */
const TITLE = /categories\.ui\.invoice$/;
const ANY_VALUE = "forms.invoices.filters.anyValue";
const DYNAMIC_HINT = "forms.invoices.filters.dynamicHint";
const FOOD = 3001;
const TRANSPORT = 3063;

function makeFilters(overrides: Partial<FilterState> = {}): FilterState {
  return {
    search: "",
    dateFrom: null,
    dateTo: null,
    amountMin: null,
    amountMax: null,
    categoryFilters: [],
    paymentTypes: [],
    currencies: [],
    sortBy: "date",
    sortOrder: "desc",
    view: "table",
    ...overrides,
  };
}

describe("CategoryFilterCard", () => {
  it("renders nothing when no classification groups are available", () => {
    // Arrange & Act
    const {container} = render(
      <CategoryFilterCard
        filters={makeFilters({categoryFilters: [FOOD]})}
        availableCategories={[]}
        onFiltersChange={vi.fn()}
      />,
    );

    // Assert
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText(TITLE)).not.toBeInTheDocument();
  });

  it("shows the any-value label, the dynamic hint, and unpressed chips when no group is selected", () => {
    // Arrange & Act
    render(
      <CategoryFilterCard
        filters={makeFilters()}
        availableCategories={[FOOD, UNCATEGORIZED_FILTER]}
        onFiltersChange={vi.fn()}
      />,
    );

    // Assert
    expect(screen.getByText(TITLE)).toBeInTheDocument();
    expect(screen.getByText(ANY_VALUE)).toBeInTheDocument();
    expect(screen.getByLabelText(DYNAMIC_HINT)).toBeInTheDocument();
    expect(screen.getByRole("button", {name: "categories.invoices.groceries"})).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", {name: "categories.ui.unclassified"})).toHaveAttribute("aria-pressed", "false");
  });

  it("lists every selected group in the summary and presses only the selected chips", () => {
    // Arrange & Act
    render(
      <CategoryFilterCard
        filters={makeFilters({categoryFilters: [FOOD, UNCATEGORIZED_FILTER, TRANSPORT]})}
        availableCategories={[FOOD, TRANSPORT, UNCATEGORIZED_FILTER, 3045]}
        onFiltersChange={vi.fn()}
      />,
    );

    // Assert
    expect(
      screen.getByText("categories.invoices.groceries, categories.ui.unclassified, categories.invoices.vehicleFuel"),
    ).toBeInTheDocument();
    expect(screen.queryByText(ANY_VALUE)).not.toBeInTheDocument();
    expect(screen.getByRole("button", {name: "categories.invoices.groceries"})).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", {name: "categories.invoices.vehicleFuel"})).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", {name: "categories.ui.unclassified"})).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", {name: "categories.invoices.medicines"})).toHaveAttribute("aria-pressed", "false");
  });

  it("adds an unselected group to the selection when its chip is clicked", async () => {
    // Arrange
    const user = userEvent.setup();
    const onFiltersChange = vi.fn();
    render(
      <CategoryFilterCard
        filters={makeFilters({categoryFilters: [FOOD]})}
        availableCategories={[FOOD, TRANSPORT]}
        onFiltersChange={onFiltersChange}
      />,
    );

    // Act
    await user.click(screen.getByRole("button", {name: "categories.invoices.vehicleFuel"}));

    // Assert
    expect(onFiltersChange).toHaveBeenCalledTimes(1);
    expect(onFiltersChange).toHaveBeenCalledWith({categoryFilters: [FOOD, TRANSPORT]});
  });

  it("removes a selected group from the selection when its chip is clicked", async () => {
    // Arrange
    const user = userEvent.setup();
    const onFiltersChange = vi.fn();
    render(
      <CategoryFilterCard
        filters={makeFilters({categoryFilters: [FOOD, TRANSPORT]})}
        availableCategories={[FOOD, TRANSPORT]}
        onFiltersChange={onFiltersChange}
      />,
    );

    // Act
    await user.click(screen.getByRole("button", {name: "categories.invoices.groceries"}));

    // Assert
    expect(onFiltersChange).toHaveBeenCalledTimes(1);
    expect(onFiltersChange).toHaveBeenCalledWith({categoryFilters: [TRANSPORT]});
  });
});
