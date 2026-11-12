/**
 * @fileoverview Unit tests for the CurrencyFilterCard invoice filter.
 * @module app/domains/invoices/view-invoices/_components/filters/CurrencyFilterCard.test
 */

import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, it, vi} from "vitest";
import type {FilterState} from "../../_hooks/useInvoiceFilters";
import {CurrencyFilterCard} from "./CurrencyFilterCard";

/** The title renders after a decorative emoji, so match the translated key at the end of the title text. */
const TITLE = /forms\.invoices\.filters\.currency$/;
const CURRENCY_ANY = "forms.invoices.filters.currencyAny";
const DYNAMIC_HINT = "forms.invoices.filters.dynamicHint";

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

describe("CurrencyFilterCard", () => {
  it("renders nothing when no currencies are available", () => {
    // Arrange & Act
    const {container} = render(
      <CurrencyFilterCard
        filters={makeFilters({currencies: ["EUR"]})}
        availableCurrencies={[]}
        onFiltersChange={vi.fn()}
      />,
    );

    // Assert
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText(TITLE)).not.toBeInTheDocument();
  });

  it("shows the any-currency label, the dynamic hint, and unpressed chips when no currency is selected", () => {
    // Arrange & Act
    render(
      <CurrencyFilterCard
        filters={makeFilters()}
        availableCurrencies={["RON", "EUR"]}
        onFiltersChange={vi.fn()}
      />,
    );

    // Assert
    expect(screen.getByText(TITLE)).toBeInTheDocument();
    expect(screen.getByText(CURRENCY_ANY)).toBeInTheDocument();
    expect(screen.getByLabelText(DYNAMIC_HINT)).toBeInTheDocument();
    expect(screen.getByRole("button", {name: "RON"})).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", {name: "EUR"})).toHaveAttribute("aria-pressed", "false");
  });

  it.each([
    {count: "one", currencies: ["EUR"], summary: "EUR"},
    {count: "two", currencies: ["EUR", "USD"], summary: "EUR, USD"},
  ])("lists every code in the summary when $count currencies are selected", ({currencies, summary}) => {
    // Arrange & Act
    const {container} = render(
      <CurrencyFilterCard
        filters={makeFilters({currencies})}
        availableCurrencies={["RON", "EUR", "USD"]}
        onFiltersChange={vi.fn()}
      />,
    );

    // Assert
    expect(container.querySelector("[class*='activeValuePill']")).toHaveTextContent(new RegExp(`^${summary}$`));
    expect(screen.queryByText(CURRENCY_ANY)).not.toBeInTheDocument();
    expect(screen.getByRole("button", {name: "RON"})).toHaveAttribute("aria-pressed", "false");
    for (const code of currencies) {
      expect(screen.getByRole("button", {name: code})).toHaveAttribute("aria-pressed", "true");
    }
  });

  it("shows the first two codes and an overflow count when more than two currencies are selected", () => {
    // Arrange & Act
    render(
      <CurrencyFilterCard
        filters={makeFilters({currencies: ["EUR", "USD", "RON", "GBP"]})}
        availableCurrencies={["RON", "EUR", "USD", "GBP"]}
        onFiltersChange={vi.fn()}
      />,
    );

    // Assert
    expect(screen.getByText("EUR, USD, +2")).toBeInTheDocument();
    expect(screen.queryByText("EUR, USD, RON, GBP")).not.toBeInTheDocument();
  });

  it("adds an unselected currency to the selection when its chip is clicked", async () => {
    // Arrange
    const user = userEvent.setup();
    const onFiltersChange = vi.fn();
    render(
      <CurrencyFilterCard
        filters={makeFilters({currencies: ["RON"]})}
        availableCurrencies={["RON", "EUR"]}
        onFiltersChange={onFiltersChange}
      />,
    );

    // Act
    await user.click(screen.getByRole("button", {name: "EUR"}));

    // Assert
    expect(onFiltersChange).toHaveBeenCalledTimes(1);
    expect(onFiltersChange).toHaveBeenCalledWith({currencies: ["RON", "EUR"]});
  });

  it("removes a selected currency from the selection when its chip is clicked", async () => {
    // Arrange
    const user = userEvent.setup();
    const onFiltersChange = vi.fn();
    render(
      <CurrencyFilterCard
        filters={makeFilters({currencies: ["RON", "EUR"]})}
        availableCurrencies={["RON", "EUR"]}
        onFiltersChange={onFiltersChange}
      />,
    );

    // Act
    await user.click(screen.getByRole("button", {name: "RON"}));

    // Assert
    expect(onFiltersChange).toHaveBeenCalledTimes(1);
    expect(onFiltersChange).toHaveBeenCalledWith({currencies: ["EUR"]});
  });
});
