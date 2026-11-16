/**
 * @fileoverview Unit tests for the DateFilterCard invoice filter.
 * @module app/domains/invoices/view-invoices/_components/filters/DateFilterCard.test
 *
 * @remarks
 * The real date-preset helpers, `formatDate`, and the `@arolariu/components` Popover/Calendar run unmodified.
 * Only the `Date` clock is frozen so the "now"-relative presets and the calendar's visible month are deterministic.
 */

import {render, screen, within} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import type {FilterState} from "../../_hooks/useInvoiceFilters";
import {DateFilterCard} from "./DateFilterCard";

/** Frozen "now": noon UTC keeps every preset on the same calendar day in any test-runner timezone. */
const NOW = new Date("2024-06-15T12:00:00.000Z");

const PRESET_LABEL = "forms.invoices.filters.datePresets";
const ANY_VALUE = "forms.invoices.filters.anyValue";
const DATE_FROM_PLACEHOLDER = "forms.invoices.filters.dateFrom";
const DATE_TO_PLACEHOLDER = "forms.invoices.filters.dateTo";

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

/** Mirrors the card's `en` short-date rendering of a stored ISO date in the runner's timezone. */
function shortDate(isoDate: string): string {
  return new Intl.DateTimeFormat("en", {dateStyle: "short"}).format(new Date(isoDate));
}

function presetButton(labelKey: string): HTMLElement {
  return screen.getByRole("button", {name: `${PRESET_LABEL}.${labelKey}`});
}

describe("DateFilterCard", () => {
  beforeEach(() => {
    vi.useFakeTimers({toFake: ["Date"]});
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("summary and preset state", () => {
    it("shows the any-value label, presses only the all-time preset, and shows placeholder triggers when no range is set", () => {
      // Arrange & Act
      render(
        <DateFilterCard
          filters={makeFilters()}
          onFiltersChange={vi.fn()}
        />,
      );

      // Assert
      expect(screen.getByText("forms.invoices.filters.dateRange")).toBeInTheDocument();
      expect(screen.getByText(ANY_VALUE)).toBeInTheDocument();
      expect(presetButton("all")).toHaveAttribute("aria-pressed", "true");
      expect(presetButton("value30d")).toHaveAttribute("aria-pressed", "false");
      expect(presetButton("value90d")).toHaveAttribute("aria-pressed", "false");
      expect(presetButton("ytd")).toHaveAttribute("aria-pressed", "false");
      expect(screen.getByRole("button", {name: DATE_FROM_PLACEHOLDER})).toBeInTheDocument();
      expect(screen.getByRole("button", {name: DATE_TO_PLACEHOLDER})).toBeInTheDocument();
    });

    it.each([
      {labelKey: "value30d", dateFrom: "2024-05-16", dateTo: "2024-06-15"},
      {labelKey: "value90d", dateFrom: "2024-03-17", dateTo: "2024-06-15"},
      {labelKey: "ytd", dateFrom: "2024-01-01", dateTo: "2024-06-15"},
    ])("summarizes a range matching the $labelKey preset with the preset label", ({labelKey, dateFrom, dateTo}) => {
      // Arrange & Act
      render(
        <DateFilterCard
          filters={makeFilters({dateFrom, dateTo})}
          onFiltersChange={vi.fn()}
        />,
      );

      // Assert — the label renders once on the preset button and once in the active pill.
      expect(screen.getAllByText(`${PRESET_LABEL}.${labelKey}`)).toHaveLength(2);
      expect(presetButton(labelKey)).toHaveAttribute("aria-pressed", "true");
      expect(presetButton("all")).toHaveAttribute("aria-pressed", "false");
      expect(screen.queryByText(ANY_VALUE)).not.toBeInTheDocument();
      expect(screen.getByRole("button", {name: shortDate(dateFrom)})).toBeInTheDocument();
      expect(screen.getByRole("button", {name: shortDate(dateTo)})).toBeInTheDocument();
    });

    it("summarizes a custom bounded range as from – to with no preset pressed", () => {
      // Arrange & Act
      render(
        <DateFilterCard
          filters={makeFilters({dateFrom: "2024-02-01", dateTo: "2024-02-10"})}
          onFiltersChange={vi.fn()}
        />,
      );

      // Assert
      expect(screen.getByText(`${shortDate("2024-02-01")} – ${shortDate("2024-02-10")}`)).toBeInTheDocument();
      for (const labelKey of ["value30d", "value90d", "ytd", "all"]) {
        expect(presetButton(labelKey)).toHaveAttribute("aria-pressed", "false");
      }
      expect(screen.queryByText(ANY_VALUE)).not.toBeInTheDocument();
    });

    it("summarizes a start-only range with a lower-bound prefix and keeps the end placeholder", () => {
      // Arrange & Act
      render(
        <DateFilterCard
          filters={makeFilters({dateFrom: "2024-02-01"})}
          onFiltersChange={vi.fn()}
        />,
      );

      // Assert
      expect(screen.getByText(`≥ ${shortDate("2024-02-01")}`)).toBeInTheDocument();
      expect(screen.getByRole("button", {name: shortDate("2024-02-01")})).toBeInTheDocument();
      expect(screen.getByRole("button", {name: DATE_TO_PLACEHOLDER})).toBeInTheDocument();
      expect(screen.queryByRole("button", {name: DATE_FROM_PLACEHOLDER})).not.toBeInTheDocument();
    });

    it("summarizes an end-only range with an upper-bound prefix and keeps the start placeholder", () => {
      // Arrange & Act
      render(
        <DateFilterCard
          filters={makeFilters({dateTo: "2024-02-10"})}
          onFiltersChange={vi.fn()}
        />,
      );

      // Assert
      expect(screen.getByText(`≤ ${shortDate("2024-02-10")}`)).toBeInTheDocument();
      expect(screen.getByRole("button", {name: shortDate("2024-02-10")})).toBeInTheDocument();
      expect(screen.getByRole("button", {name: DATE_FROM_PLACEHOLDER})).toBeInTheDocument();
      expect(screen.queryByRole("button", {name: DATE_TO_PLACEHOLDER})).not.toBeInTheDocument();
    });

    it("falls back to the any-value label when the only bound is an empty string", () => {
      // Arrange & Act
      render(
        <DateFilterCard
          filters={makeFilters({dateFrom: ""})}
          onFiltersChange={vi.fn()}
        />,
      );

      // Assert — an empty bound is not a preset and has no date to summarize.
      expect(screen.getByText(ANY_VALUE)).toBeInTheDocument();
      expect(presetButton("all")).toHaveAttribute("aria-pressed", "false");
      expect(screen.getByRole("button", {name: DATE_FROM_PLACEHOLDER})).toBeInTheDocument();
    });
  });

  describe("preset buttons", () => {
    it.each([
      {labelKey: "value30d", patch: {dateFrom: "2024-05-16", dateTo: "2024-06-15"}},
      {labelKey: "value90d", patch: {dateFrom: "2024-03-17", dateTo: "2024-06-15"}},
      {labelKey: "ytd", patch: {dateFrom: "2024-01-01", dateTo: "2024-06-15"}},
      {labelKey: "all", patch: {dateFrom: null, dateTo: null}},
    ])("emits the $labelKey range computed from now", async ({labelKey, patch}) => {
      // Arrange
      const user = userEvent.setup();
      const onFiltersChange = vi.fn();
      render(
        <DateFilterCard
          filters={makeFilters({dateFrom: "2024-02-01", dateTo: "2024-02-10"})}
          onFiltersChange={onFiltersChange}
        />,
      );

      // Act
      await user.click(presetButton(labelKey));

      // Assert
      expect(onFiltersChange).toHaveBeenCalledTimes(1);
      expect(onFiltersChange).toHaveBeenCalledWith(patch);
    });
  });

  describe("calendar pickers", () => {
    it("emits the picked start date as an ISO date string", async () => {
      // Arrange
      const user = userEvent.setup();
      const onFiltersChange = vi.fn();
      render(
        <DateFilterCard
          filters={makeFilters()}
          onFiltersChange={onFiltersChange}
        />,
      );

      // Act
      await user.click(screen.getByRole("button", {name: DATE_FROM_PLACEHOLDER}));
      const popup = await screen.findByRole("dialog");
      await user.click(within(popup).getByRole("button", {name: /June 10th, 2024/}));

      // Assert
      expect(onFiltersChange).toHaveBeenCalledTimes(1);
      expect(onFiltersChange).toHaveBeenCalledWith({dateFrom: "2024-06-10"});
    });

    it("emits the picked end date as an ISO date string", async () => {
      // Arrange
      const user = userEvent.setup();
      const onFiltersChange = vi.fn();
      render(
        <DateFilterCard
          filters={makeFilters()}
          onFiltersChange={onFiltersChange}
        />,
      );

      // Act
      await user.click(screen.getByRole("button", {name: DATE_TO_PLACEHOLDER}));
      const popup = await screen.findByRole("dialog");
      await user.click(within(popup).getByRole("button", {name: /June 20th, 2024/}));

      // Assert
      expect(onFiltersChange).toHaveBeenCalledTimes(1);
      expect(onFiltersChange).toHaveBeenCalledWith({dateTo: "2024-06-20"});
    });

    it.each([
      {bound: "start", filters: {dateFrom: "2024-06-10"}, isoDate: "2024-06-10", patch: {dateFrom: null}},
      {bound: "end", filters: {dateTo: "2024-06-12"}, isoDate: "2024-06-12", patch: {dateTo: null}},
    ])("clears the $bound date when its selected calendar day is picked again", async ({filters, isoDate, patch}) => {
      // Arrange
      const user = userEvent.setup();
      const onFiltersChange = vi.fn();
      render(
        <DateFilterCard
          filters={makeFilters(filters)}
          onFiltersChange={onFiltersChange}
        />,
      );

      // Act
      await user.click(screen.getByRole("button", {name: shortDate(isoDate)}));
      const popup = await screen.findByRole("dialog");
      const selectedDay = within(popup).getByRole("gridcell", {selected: true});
      await user.click(within(selectedDay).getByRole("button"));

      // Assert
      expect(onFiltersChange).toHaveBeenCalledTimes(1);
      expect(onFiltersChange).toHaveBeenCalledWith(patch);
    });
  });
});
