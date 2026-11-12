/**
 * @fileoverview Unit tests for the PaymentTypeFilterCard invoice filter.
 * @module app/domains/invoices/view-invoices/_components/filters/PaymentTypeFilterCard.test
 */

import {PaymentType} from "@/types/invoices";
import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, it, vi} from "vitest";
import type {FilterState} from "../../_hooks/useInvoiceFilters";
import {PaymentTypeFilterCard} from "./PaymentTypeFilterCard";

/** The title renders after a decorative emoji, so match the translated key at the end of the title text. */
const TITLE = /forms\.invoices\.filters\.paymentTypes$/;
const ANY_VALUE = "forms.invoices.filters.anyValue";
const DYNAMIC_HINT = "forms.invoices.filters.dynamicHint";

/** Deterministic label formatter supplied through the card's public `getPaymentTypeLabel` prop. */
function paymentTypeLabel(paymentType: PaymentType): string {
  switch (paymentType) {
    case PaymentType.Cash:
      return "Cash";
    case PaymentType.Card:
      return "Card";
    case PaymentType.Transfer:
      return "Transfer";
    default:
      return `Type ${paymentType}`;
  }
}

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

describe("PaymentTypeFilterCard", () => {
  it("renders nothing when no payment types are available", () => {
    // Arrange & Act
    const {container} = render(
      <PaymentTypeFilterCard
        filters={makeFilters({paymentTypes: [PaymentType.Cash]})}
        availablePaymentTypes={[]}
        getPaymentTypeLabel={paymentTypeLabel}
        onFiltersChange={vi.fn()}
      />,
    );

    // Assert
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText(TITLE)).not.toBeInTheDocument();
  });

  it("shows the any-value label, the dynamic hint, and formatted unpressed chips when no type is selected", () => {
    // Arrange & Act
    render(
      <PaymentTypeFilterCard
        filters={makeFilters()}
        availablePaymentTypes={[PaymentType.Card, PaymentType.Cash]}
        getPaymentTypeLabel={paymentTypeLabel}
        onFiltersChange={vi.fn()}
      />,
    );

    // Assert
    expect(screen.getByText(TITLE)).toBeInTheDocument();
    expect(screen.getByText(ANY_VALUE)).toBeInTheDocument();
    expect(screen.getByLabelText(DYNAMIC_HINT)).toBeInTheDocument();
    expect(screen.getByRole("button", {name: "Card"})).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", {name: "Cash"})).toHaveAttribute("aria-pressed", "false");
  });

  it("summarizes the selected types with their formatted labels and presses only those chips", () => {
    // Arrange & Act
    render(
      <PaymentTypeFilterCard
        filters={makeFilters({paymentTypes: [PaymentType.Transfer, PaymentType.Card]})}
        availablePaymentTypes={[PaymentType.Card, PaymentType.Cash, PaymentType.Transfer]}
        getPaymentTypeLabel={paymentTypeLabel}
        onFiltersChange={vi.fn()}
      />,
    );

    // Assert
    expect(screen.getByText("Transfer, Card")).toBeInTheDocument();
    expect(screen.queryByText(ANY_VALUE)).not.toBeInTheDocument();
    expect(screen.getByRole("button", {name: "Card"})).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", {name: "Transfer"})).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", {name: "Cash"})).toHaveAttribute("aria-pressed", "false");
  });

  it("adds an unselected payment type to the selection when its chip is clicked", async () => {
    // Arrange
    const user = userEvent.setup();
    const onFiltersChange = vi.fn();
    render(
      <PaymentTypeFilterCard
        filters={makeFilters({paymentTypes: [PaymentType.Card]})}
        availablePaymentTypes={[PaymentType.Card, PaymentType.Voucher]}
        getPaymentTypeLabel={paymentTypeLabel}
        onFiltersChange={onFiltersChange}
      />,
    );

    // Act
    await user.click(screen.getByRole("button", {name: `Type ${PaymentType.Voucher}`}));

    // Assert
    expect(onFiltersChange).toHaveBeenCalledTimes(1);
    expect(onFiltersChange).toHaveBeenCalledWith({paymentTypes: [PaymentType.Card, PaymentType.Voucher]});
  });

  it("removes a selected payment type from the selection when its chip is clicked", async () => {
    // Arrange
    const user = userEvent.setup();
    const onFiltersChange = vi.fn();
    render(
      <PaymentTypeFilterCard
        filters={makeFilters({paymentTypes: [PaymentType.Card, PaymentType.Cash]})}
        availablePaymentTypes={[PaymentType.Card, PaymentType.Cash]}
        getPaymentTypeLabel={paymentTypeLabel}
        onFiltersChange={onFiltersChange}
      />,
    );

    // Act
    await user.click(screen.getByRole("button", {name: "Card"}));

    // Assert
    expect(onFiltersChange).toHaveBeenCalledTimes(1);
    expect(onFiltersChange).toHaveBeenCalledWith({paymentTypes: [PaymentType.Cash]});
  });
});
