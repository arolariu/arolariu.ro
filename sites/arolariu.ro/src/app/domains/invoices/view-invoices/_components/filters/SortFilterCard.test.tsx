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
});
