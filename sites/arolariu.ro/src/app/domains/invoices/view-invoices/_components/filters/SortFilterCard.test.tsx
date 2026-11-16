/**
 * @fileoverview Regression tests for SortFilterCard trigger labels.
 * @module app/domains/invoices/view-invoices/_components/filters/SortFilterCard.test
 *
 * @remarks
 * Base UI `Select.Value` falls back to the raw value string when the Select root
 * has no `items` lookup. These tests pin that the trigger renders the translated
 * option label instead of the raw `${sortBy}-${sortOrder}` value.
 */

import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, it, vi} from "vitest";
import type {FilterState} from "../../_hooks/useInvoiceFilters";
import {SortFilterCard} from "./SortFilterCard";

function makeFilters(overrides: Partial<FilterState>): FilterState {
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

describe("SortFilterCard", () => {
  it("shows the translated label in the trigger for the default sort, not the raw value", () => {
    render(
      <SortFilterCard
        filters={makeFilters({sortBy: "date", sortOrder: "desc"})}
        onFiltersChange={vi.fn()}
      />,
    );

    const trigger = screen.getByRole("combobox");
    expect(trigger).toHaveTextContent("forms.invoices.filters.sortOptions.dateNewest");
    expect(trigger).not.toHaveTextContent("date-desc");
  });

  it("shows the translated label in the trigger for a non-default sort, not the raw value", () => {
    render(
      <SortFilterCard
        filters={makeFilters({sortBy: "amount", sortOrder: "asc"})}
        onFiltersChange={vi.fn()}
      />,
    );

    const trigger = screen.getByRole("combobox");
    expect(trigger).toHaveTextContent("forms.invoices.filters.sortOptions.amountLowToHigh");
    expect(trigger).not.toHaveTextContent("amount-asc");
  });

  it.each([
    {sortBy: "date", sortOrder: "asc", label: "dateOldest"},
    {sortBy: "amount", sortOrder: "desc", label: "amountHighToLow"},
    {sortBy: "name", sortOrder: "asc", label: "nameAZ"},
    {sortBy: "name", sortOrder: "desc", label: "nameZA"},
  ] as const)("shows the $label active pill for a $sortBy $sortOrder sort", ({sortBy, sortOrder, label}) => {
    render(
      <SortFilterCard
        filters={makeFilters({sortBy, sortOrder})}
        onFiltersChange={vi.fn()}
      />,
    );

    // The label appears twice: once in the trigger and once in the active pill.
    expect(screen.getAllByText(`forms.invoices.filters.sortOptions.${label}`)).toHaveLength(2);
    expect(screen.queryByText("forms.invoices.filters.defaultValue")).not.toBeInTheDocument();
  });

  it("shows the default label and no pill for the default date-desc sort", () => {
    render(
      <SortFilterCard
        filters={makeFilters({sortBy: "date", sortOrder: "desc"})}
        onFiltersChange={vi.fn()}
      />,
    );

    expect(screen.getByText("forms.invoices.filters.defaultValue")).toBeInTheDocument();
    expect(screen.getAllByText("forms.invoices.filters.sortOptions.dateNewest")).toHaveLength(1);
  });

  it("renders an empty active pill when no sort field is set", () => {
    const {container} = render(
      <SortFilterCard
        filters={makeFilters({sortBy: null, sortOrder: null})}
        onFiltersChange={vi.fn()}
      />,
    );

    // A cleared sort is not the default sort, so the card is active but has no label to summarize.
    const pill = container.querySelector("[class*='activeValuePill']");
    expect(pill).toBeEmptyDOMElement();
    expect(screen.queryByText("forms.invoices.filters.defaultValue")).not.toBeInTheDocument();
  });

  it.each([
    {option: "nameZA", sortBy: "name", sortOrder: "desc"},
    {option: "amountHighToLow", sortBy: "amount", sortOrder: "desc"},
  ])("emits the parsed field and direction when the $option option is chosen", async ({option, sortBy, sortOrder}) => {
    const onFiltersChange = vi.fn();
    render(
      <SortFilterCard
        filters={makeFilters({sortBy: "date", sortOrder: "desc"})}
        onFiltersChange={onFiltersChange}
      />,
    );

    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.click(await screen.findByRole("option", {name: `forms.invoices.filters.sortOptions.${option}`}));

    expect(onFiltersChange).toHaveBeenCalledTimes(1);
    expect(onFiltersChange).toHaveBeenCalledWith({sortBy, sortOrder});
  });

  it("emits no filter change when browsing the options of a cleared sort without choosing one", async () => {
    // Arrange
    const user = userEvent.setup();
    const onFiltersChange = vi.fn();
    const {rerender} = render(
      <SortFilterCard
        filters={makeFilters({sortBy: null, sortOrder: null})}
        onFiltersChange={onFiltersChange}
      />,
    );

    // Act — re-render with an unrelated filter change while the options are open, then dismiss them.
    await user.click(screen.getByRole("combobox"));
    expect(await screen.findByRole("option", {name: "forms.invoices.filters.sortOptions.nameAZ"})).toBeInTheDocument();
    rerender(
      <SortFilterCard
        filters={makeFilters({sortBy: null, sortOrder: null, search: "milk"})}
        onFiltersChange={onFiltersChange}
      />,
    );
    await user.keyboard("{Escape}");

    // Assert
    expect(onFiltersChange).not.toHaveBeenCalled();
  });
});
