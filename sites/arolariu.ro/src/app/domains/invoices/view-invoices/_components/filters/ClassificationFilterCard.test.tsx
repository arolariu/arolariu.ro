/**
 * @fileoverview Unit tests for the ClassificationFilterCard invoice filter.
 * @module app/domains/invoices/view-invoices/_components/filters/ClassificationFilterCard.test
 */

import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, it, vi} from "vitest";
import type {FilterState} from "../../_hooks/useInvoiceFilters";
import {UNCLASSIFIED_GROUP} from "../../_utils/filterOptions";
import {ClassificationFilterCard} from "./ClassificationFilterCard";

/** The title renders after a decorative emoji, so match the translated key at the end of the title text. */
const TITLE = /forms\.invoices\.filters\.classificationGroups$/;
const ANY_VALUE = "forms.invoices.filters.anyValue";
const DYNAMIC_HINT = "forms.invoices.filters.dynamicHint";
const FOOD = "Food and non-alcoholic beverages";
const TRANSPORT = "Transport";

function makeFilters(overrides: Partial<FilterState> = {}): FilterState {
  return {
    search: "",
    dateFrom: null,
    dateTo: null,
    amountMin: null,
    amountMax: null,
    classificationGroups: [],
    paymentTypes: [],
    currencies: [],
    sortBy: "date",
    sortOrder: "desc",
    view: "table",
    ...overrides,
  };
}

describe("ClassificationFilterCard", () => {
  it("renders nothing when no classification groups are available", () => {
    // Arrange & Act
    const {container} = render(
      <ClassificationFilterCard
        filters={makeFilters({classificationGroups: [FOOD]})}
        availableClassificationGroups={[]}
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
      <ClassificationFilterCard
        filters={makeFilters()}
        availableClassificationGroups={[FOOD, UNCLASSIFIED_GROUP]}
        onFiltersChange={vi.fn()}
      />,
    );

    // Assert
    expect(screen.getByText(TITLE)).toBeInTheDocument();
    expect(screen.getByText(ANY_VALUE)).toBeInTheDocument();
    expect(screen.getByLabelText(DYNAMIC_HINT)).toBeInTheDocument();
    expect(screen.getByRole("button", {name: FOOD})).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", {name: UNCLASSIFIED_GROUP})).toHaveAttribute("aria-pressed", "false");
  });

  it("lists every selected group in the summary and presses only the selected chips", () => {
    // Arrange & Act
    render(
      <ClassificationFilterCard
        filters={makeFilters({classificationGroups: [FOOD, UNCLASSIFIED_GROUP, TRANSPORT]})}
        availableClassificationGroups={[FOOD, TRANSPORT, UNCLASSIFIED_GROUP, "Health"]}
        onFiltersChange={vi.fn()}
      />,
    );

    // Assert
    expect(screen.getByText(`${FOOD}, ${UNCLASSIFIED_GROUP}, ${TRANSPORT}`)).toBeInTheDocument();
    expect(screen.queryByText(ANY_VALUE)).not.toBeInTheDocument();
    expect(screen.getByRole("button", {name: FOOD})).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", {name: TRANSPORT})).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", {name: UNCLASSIFIED_GROUP})).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", {name: "Health"})).toHaveAttribute("aria-pressed", "false");
  });

  it("adds an unselected group to the selection when its chip is clicked", async () => {
    // Arrange
    const user = userEvent.setup();
    const onFiltersChange = vi.fn();
    render(
      <ClassificationFilterCard
        filters={makeFilters({classificationGroups: [FOOD]})}
        availableClassificationGroups={[FOOD, TRANSPORT]}
        onFiltersChange={onFiltersChange}
      />,
    );

    // Act
    await user.click(screen.getByRole("button", {name: TRANSPORT}));

    // Assert
    expect(onFiltersChange).toHaveBeenCalledTimes(1);
    expect(onFiltersChange).toHaveBeenCalledWith({classificationGroups: [FOOD, TRANSPORT]});
  });

  it("removes a selected group from the selection when its chip is clicked", async () => {
    // Arrange
    const user = userEvent.setup();
    const onFiltersChange = vi.fn();
    render(
      <ClassificationFilterCard
        filters={makeFilters({classificationGroups: [FOOD, TRANSPORT]})}
        availableClassificationGroups={[FOOD, TRANSPORT]}
        onFiltersChange={onFiltersChange}
      />,
    );

    // Act
    await user.click(screen.getByRole("button", {name: FOOD}));

    // Assert
    expect(onFiltersChange).toHaveBeenCalledTimes(1);
    expect(onFiltersChange).toHaveBeenCalledWith({classificationGroups: [TRANSPORT]});
  });
});
