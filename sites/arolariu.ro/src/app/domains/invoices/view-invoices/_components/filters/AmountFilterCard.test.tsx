/**
 * @fileoverview Unit tests for the AmountFilterCard invoice filter.
 * @module app/domains/invoices/view-invoices/_components/filters/AmountFilterCard.test
 */

import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, it, vi} from "vitest";
import type {FilterState} from "../../_hooks/useInvoiceFilters";
import {AmountFilterCard} from "./AmountFilterCard";

const PRESET_LABEL = "forms.invoices.filters.amountPresets";
const PRESET_LABEL_KEYS = ["value0to50", "value50to100", "value100to500", "value500plus"] as const;
const ANY_VALUE = "forms.invoices.filters.anyValue";
const MIN_PLACEHOLDER = "forms.invoices.filters.amountMin";
const MAX_PLACEHOLDER = "forms.invoices.filters.amountMax";

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

function presetButton(labelKey: string): HTMLElement {
  return screen.getByRole("button", {name: `${PRESET_LABEL}.${labelKey}`});
}

describe("AmountFilterCard", () => {
  describe("summary and preset state", () => {
    it("shows the any-value label, empty inputs, and no pressed preset when no bound is set", () => {
      // Arrange & Act
      render(
        <AmountFilterCard
          filters={makeFilters()}
          onFiltersChange={vi.fn()}
        />,
      );

      // Assert
      expect(screen.getByText("forms.invoices.filters.amountRange")).toBeInTheDocument();
      expect(screen.getByText(ANY_VALUE)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(MIN_PLACEHOLDER)).toHaveValue(null);
      expect(screen.getByPlaceholderText(MAX_PLACEHOLDER)).toHaveValue(null);
      for (const labelKey of PRESET_LABEL_KEYS) {
        expect(presetButton(labelKey)).toHaveAttribute("aria-pressed", "false");
      }
    });

    it.each([
      {case: "both bounds", amountMin: 10, amountMax: 20, summary: "10 – 20"},
      {case: "only a minimum", amountMin: 10, amountMax: null, summary: "≥ 10"},
      {case: "only a maximum", amountMin: null, amountMax: 20, summary: "≤ 20"},
    ])("summarizes $case as $summary and reflects the bounds in the inputs", ({amountMin, amountMax, summary}) => {
      // Arrange & Act
      render(
        <AmountFilterCard
          filters={makeFilters({amountMin, amountMax})}
          onFiltersChange={vi.fn()}
        />,
      );

      // Assert
      expect(screen.getByText(summary)).toBeInTheDocument();
      expect(screen.queryByText(ANY_VALUE)).not.toBeInTheDocument();
      expect(screen.getByPlaceholderText(MIN_PLACEHOLDER)).toHaveValue(amountMin);
      expect(screen.getByPlaceholderText(MAX_PLACEHOLDER)).toHaveValue(amountMax);
      for (const labelKey of PRESET_LABEL_KEYS) {
        expect(presetButton(labelKey)).toHaveAttribute("aria-pressed", "false");
      }
    });

    it.each([
      {labelKey: "value0to50", amountMin: 0, amountMax: 50},
      {labelKey: "value500plus", amountMin: 500, amountMax: null},
    ])("presses only the $labelKey preset when the bounds match it exactly", ({labelKey, amountMin, amountMax}) => {
      // Arrange & Act
      render(
        <AmountFilterCard
          filters={makeFilters({amountMin, amountMax})}
          onFiltersChange={vi.fn()}
        />,
      );

      // Assert
      for (const candidate of PRESET_LABEL_KEYS) {
        expect(presetButton(candidate)).toHaveAttribute("aria-pressed", String(candidate === labelKey));
      }
    });
  });

  describe("preset buttons", () => {
    it.each([
      {labelKey: "value0to50", patch: {amountMin: 0, amountMax: 50}},
      {labelKey: "value50to100", patch: {amountMin: 50, amountMax: 100}},
      {labelKey: "value100to500", patch: {amountMin: 100, amountMax: 500}},
      {labelKey: "value500plus", patch: {amountMin: 500, amountMax: null}},
    ])("applies the $labelKey bounds when no preset is active", async ({labelKey, patch}) => {
      // Arrange
      const user = userEvent.setup();
      const onFiltersChange = vi.fn();
      render(
        <AmountFilterCard
          filters={makeFilters()}
          onFiltersChange={onFiltersChange}
        />,
      );

      // Act
      await user.click(presetButton(labelKey));

      // Assert
      expect(onFiltersChange).toHaveBeenCalledTimes(1);
      expect(onFiltersChange).toHaveBeenCalledWith(patch);
    });

    it("replaces an active preset with a different preset's bounds", async () => {
      // Arrange
      const user = userEvent.setup();
      const onFiltersChange = vi.fn();
      render(
        <AmountFilterCard
          filters={makeFilters({amountMin: 0, amountMax: 50})}
          onFiltersChange={onFiltersChange}
        />,
      );

      // Act
      await user.click(presetButton("value50to100"));

      // Assert
      expect(onFiltersChange).toHaveBeenCalledTimes(1);
      expect(onFiltersChange).toHaveBeenCalledWith({amountMin: 50, amountMax: 100});
    });

    it("clears both bounds when the active preset is clicked again", async () => {
      // Arrange
      const user = userEvent.setup();
      const onFiltersChange = vi.fn();
      render(
        <AmountFilterCard
          filters={makeFilters({amountMin: 100, amountMax: 500})}
          onFiltersChange={onFiltersChange}
        />,
      );

      // Act
      await user.click(presetButton("value100to500"));

      // Assert
      expect(onFiltersChange).toHaveBeenCalledTimes(1);
      expect(onFiltersChange).toHaveBeenCalledWith({amountMin: null, amountMax: null});
    });
  });

  describe("bound inputs", () => {
    it("emits a parsed minimum when a value is typed into the minimum input", async () => {
      // Arrange
      const user = userEvent.setup();
      const onFiltersChange = vi.fn();
      render(
        <AmountFilterCard
          filters={makeFilters()}
          onFiltersChange={onFiltersChange}
        />,
      );

      // Act
      await user.type(screen.getByPlaceholderText(MIN_PLACEHOLDER), "7");

      // Assert
      expect(onFiltersChange).toHaveBeenCalledTimes(1);
      expect(onFiltersChange).toHaveBeenCalledWith({amountMin: 7});
    });

    it("emits a parsed decimal maximum when a value is pasted into the maximum input", async () => {
      // Arrange
      const user = userEvent.setup();
      const onFiltersChange = vi.fn();
      render(
        <AmountFilterCard
          filters={makeFilters()}
          onFiltersChange={onFiltersChange}
        />,
      );

      // Act
      await user.click(screen.getByPlaceholderText(MAX_PLACEHOLDER));
      await user.paste("12.5");

      // Assert
      expect(onFiltersChange).toHaveBeenCalledTimes(1);
      expect(onFiltersChange).toHaveBeenCalledWith({amountMax: 12.5});
    });

    it.each([
      {bound: "minimum", placeholder: MIN_PLACEHOLDER, patch: {amountMin: null}},
      {bound: "maximum", placeholder: MAX_PLACEHOLDER, patch: {amountMax: null}},
    ])("emits a null $bound when its input is cleared", async ({placeholder, patch}) => {
      // Arrange
      const user = userEvent.setup();
      const onFiltersChange = vi.fn();
      render(
        <AmountFilterCard
          filters={makeFilters({amountMin: 10, amountMax: 20})}
          onFiltersChange={onFiltersChange}
        />,
      );

      // Act
      await user.clear(screen.getByPlaceholderText(placeholder));

      // Assert
      expect(onFiltersChange).toHaveBeenCalledTimes(1);
      expect(onFiltersChange).toHaveBeenCalledWith(patch);
    });
  });
});
